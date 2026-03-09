/**
 * Config & Settings Dashboard Render Tabs
 * Extracted from index.js — commands, config, leveling, notifications, 
 * YouTube alerts, custom commands, giveaways, polls, reminders, embeds, welcome
 */
import fs from 'fs';
import path from 'path';

let _getState;

export function initConfigTabs(getStateFn) {
  _getState = getStateFn;
}

export function renderSuggestionsTab() {
  const { renderTicketsTab } = _getState();
  return renderTicketsTab();
}


// NEW: Commands and Config merged tab
export function renderCommandsAndConfigTab(tab) {
  const { stats, client, commandUsage, dashboardSettings, giveaways, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, startTime, welcomeSettings, xpMultiplier, youtubeAlerts, loadJSON, SCHED_MSG_PATH, DATA_DIR, config, levelingConfig, customCommands, engagementSettings, streamInfo, weeklyLeveling, notificationHistory, notificationFilters } = _getState();
  const subTab = tab === 'commands' ? 'config-commands' : tab;
  const isCommands = subTab === 'commands-config';
  const isConfig = subTab === 'config-commands';
  
  return isCommands ? renderCommandsContent() : renderConfigContent();
}

export function renderCommandsContent() {
  const { stats, client, commandUsage, dashboardSettings, giveaways, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, startTime, welcomeSettings, xpMultiplier, youtubeAlerts, loadJSON, SCHED_MSG_PATH, DATA_DIR, config, levelingConfig, customCommands, engagementSettings, streamInfo, weeklyLeveling, notificationHistory, notificationFilters } = _getState();
  return renderCommandsTab();
}

export function renderConfigContent() {
  const { stats, client, commandUsage, dashboardSettings, giveaways, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, startTime, welcomeSettings, xpMultiplier, youtubeAlerts, loadJSON, SCHED_MSG_PATH, DATA_DIR, config, levelingConfig, customCommands, engagementSettings, streamInfo, weeklyLeveling, notificationHistory, notificationFilters } = _getState();
  return renderConfigTab();
}

// NEW: Commands tab
export function renderCommandsTab() {
  const { stats, client, commandUsage, dashboardSettings, giveaways, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, startTime, welcomeSettings, xpMultiplier, youtubeAlerts, loadJSON, SCHED_MSG_PATH, DATA_DIR, config, levelingConfig, customCommands, engagementSettings, streamInfo, weeklyLeveling, notificationHistory, notificationFilters } = _getState();
  const commands = [
    { key: 'help', name: '/help', desc: 'Discover every available command quickly.', category: 'Utility', syntax: '/help', options: [], permissions: 'Everyone', examples: ['/help'], preview: { type: 'text', content: 'Shows the full command list.' }, addedAt: 1 },
    { key: 'streamstatus', name: '/streamstatus', desc: 'Check whether the stream is live right now.', category: 'Info', syntax: '/streamstatus', options: [], permissions: 'Everyone', examples: ['/streamstatus'], preview: { type: 'text', content: '🔴 LIVE | 124 viewers' }, addedAt: 2 },
    { key: 'lastlive', name: '/lastlive', desc: 'See the last stream title and timestamp.', category: 'Info', syntax: '/lastlive', options: [], permissions: 'Everyone', examples: ['/lastlive'], preview: { type: 'text', content: 'Last stream: "Fortnite" at 1/28/2026 8:00 PM' }, addedAt: 3 },
    { key: 'topgame', name: '/topgame', desc: 'Find the most played game on the channel.', category: 'Info', syntax: '/topgame', options: [], permissions: 'Everyone', examples: ['/topgame'], preview: { type: 'text', content: 'Top Game: Fortnite (42 streams)' }, addedAt: 4 },
    { key: 'stats', name: '/stats', desc: 'View stream stats and performance trends.', category: 'Info', syntax: '/stats', options: [], permissions: 'Everyone', examples: ['/stats'], preview: { type: 'text', content: 'Shows totals, peak viewers, and averages.' }, addedAt: 5 },
    { key: 'uptime', name: '/uptime', desc: 'Check the bot uptime in real time.', category: 'Utility', syntax: '/uptime', options: [], permissions: 'Everyone', examples: ['/uptime'], preview: { type: 'text', content: 'Bot uptime: 2d 4h 12m' }, addedAt: 6 },
    { key: 'rank', name: '/rank', desc: 'Check your level & XP rank instantly.', category: 'Utility', syntax: '/rank [@user]', options: [{ name: 'user', type: 'user', required: false }], permissions: 'Everyone', examples: ['/rank', '/rank @Antho'], preview: { type: 'text', content: 'Antho is Level 12 with 3,420 XP.' }, addedAt: 7 },
    { key: 'leaderboard', name: '/leaderboard', desc: 'Compare XP rankings across the server.', category: 'Utility', syntax: '/leaderboard', options: [], permissions: 'Everyone', examples: ['/leaderboard'], preview: { type: 'text', content: 'Shows the top XP earners.' }, addedAt: 8 },
    { key: 'cmd', name: '/cmd', desc: 'Run a custom command by name.', category: 'Utility', syntax: '/cmd name: <command>', options: [{ name: 'name', type: 'string', required: true }], permissions: 'Everyone', examples: ['/cmd name: rules'], preview: { type: 'text', content: 'Runs the selected custom command.' }, addedAt: 9 },
    { key: 'commands', name: '/commands', desc: 'List all custom commands.', category: 'Utility', syntax: '/commands', options: [], permissions: 'Everyone', examples: ['/commands'], preview: { type: 'text', content: 'Lists all custom commands.' }, addedAt: 10 },
    { key: 'suggest', name: '/suggest', desc: 'Send a suggestion to staff.', category: 'Community', syntax: '/suggest suggestion: <text>', options: [{ name: 'suggestion', type: 'string', required: true }], permissions: 'Everyone', examples: ['/suggest suggestion: Add more emotes'], preview: { type: 'text', content: 'Suggestion submitted ✅' }, addedAt: 11 },
    { key: 'warnings', name: '/warnings', desc: 'Review warnings for a user.', category: 'Moderation', syntax: '/warnings user: <@user>', options: [{ name: 'user', type: 'user', required: true }], permissions: 'Moderator', examples: ['/warnings @User'], preview: { type: 'text', content: 'Shows warning list for the user.' }, addedAt: 12 },
    { key: 'warn', name: '/warn', desc: 'Issue a warning with an optional reason.', category: 'Moderation', syntax: '/warn user: <@user> [reason]', options: [{ name: 'user', type: 'user', required: true }, { name: 'reason', type: 'string', required: false }], permissions: 'Administrator', examples: ['/warn @User Spamming'], preview: { type: 'text', content: '⚠️ User warned for: Spamming' }, addedAt: 13 },
    { key: 'alertson', name: '/alertson', desc: 'Enable stream alerts for today.', category: 'Admin', syntax: '/alertson', options: [], permissions: 'Administrator', examples: ['/alertson'], preview: { type: 'text', content: 'Alerts enabled ✅' }, addedAt: 14 },
    { key: 'alertsoff', name: '/alertsoff', desc: 'Disable stream alerts for today.', category: 'Admin', syntax: '/alertsoff', options: [], permissions: 'Administrator', examples: ['/alertsoff'], preview: { type: 'text', content: 'Alerts disabled ✅' }, addedAt: 15 },
    { key: 'setschedule', name: '/setschedule', desc: 'Set weekly stream schedule blocks.', category: 'Admin', syntax: '/setschedule time1: <HH:MM> days1: <days> [time2] [days2] channel: <#channel>', options: [{ name: 'time1', type: 'string', required: true }, { name: 'days1', type: 'string', required: true }, { name: 'channel', type: 'channel', required: true }, { name: 'time2', type: 'string', required: false }, { name: 'days2', type: 'string', required: false }], permissions: 'Administrator', examples: ['/setschedule time1: 16:00 days1: mon,tue,wed channel: #announcements'], preview: { type: 'text', content: 'Weekly schedule updated.' }, addedAt: 16 },
    { key: 'cancelstream', name: '/cancelstream', desc: 'Cancel today’s scheduled stream.', category: 'Admin', syntax: '/cancelstream', options: [], permissions: 'Administrator', examples: ['/cancelstream'], preview: { type: 'text', content: 'Today’s stream cancelled.' }, addedAt: 17 },
    { key: 'setlivemessage', name: '/setlivemessage', desc: 'Update the live announcement template.', category: 'Admin', syntax: '/setlivemessage message: <text>', options: [{ name: 'message', type: 'string', required: true }], permissions: 'Administrator', examples: ['/setlivemessage We are LIVE!'], preview: { type: 'text', content: 'Live message saved.' }, addedAt: 18 },
    { key: 'setmilestones', name: '/setmilestones', desc: 'Configure viewer milestone alerts.', category: 'Admin', syntax: '/setmilestones milestones: <list>', options: [{ name: 'milestones', type: 'string', required: true }], permissions: 'Administrator', examples: ['/setmilestones 100,250,500'], preview: { type: 'text', content: 'Milestones updated.' }, addedAt: 19 },
    { key: 'setofflinethreshold', name: '/setofflinethreshold', desc: 'Adjust offline detection delay.', category: 'Admin', syntax: '/setofflinethreshold seconds: <number>', options: [{ name: 'seconds', type: 'integer', required: true }], permissions: 'Administrator', examples: ['/setofflinethreshold 120'], preview: { type: 'text', content: 'Offline threshold updated.' }, addedAt: 20 },
    { key: 'setalertroles', name: '/setalertroles', desc: 'Assign roles for alert types.', category: 'Admin', syntax: '/setalertroles role_type: <type> role: <@role>', options: [{ name: 'role_type', type: 'string', required: true }, { name: 'role', type: 'role', required: true }], permissions: 'Administrator', examples: ['/setalertroles liveAlert @StreamPing'], preview: { type: 'text', content: 'Alert role updated.' }, addedAt: 21 },
    { key: 'forcelive', name: '/forcelive', desc: 'Force the stream state to LIVE.', category: 'Admin', syntax: '/forcelive', options: [], permissions: 'Administrator', examples: ['/forcelive'], preview: { type: 'text', content: 'Stream forced live.' }, addedAt: 22 },
    { key: 'forceoffline', name: '/forceoffline', desc: 'Force the stream state to OFFLINE.', category: 'Admin', syntax: '/forceoffline', options: [], permissions: 'Administrator', examples: ['/forceoffline'], preview: { type: 'text', content: 'Stream forced offline.' }, addedAt: 23 },
    { key: 'testdelay', name: '/testdelay', desc: 'Trigger a delayed notification test.', category: 'Admin', syntax: '/testdelay', options: [], permissions: 'Administrator', examples: ['/testdelay'], preview: { type: 'text', content: 'Delayed notification sent.' }, addedAt: 24 },
    { key: 'streamhealth', name: '/streamhealth', desc: 'Inspect stream health diagnostics.', category: 'Admin', syntax: '/streamhealth', options: [], permissions: 'Administrator', examples: ['/streamhealth'], preview: { type: 'text', content: 'Shows stream health details.' }, addedAt: 25 },
    { key: 'addcommand', name: '/addcommand', desc: 'Create a new custom command.', category: 'Admin', syntax: '/addcommand name: <text> response: <text>', options: [{ name: 'name', type: 'string', required: true }, { name: 'response', type: 'string', required: true }], permissions: 'Administrator', examples: ['/addcommand name: rules response: Be nice!'], preview: { type: 'text', content: 'Custom command created.' }, addedAt: 26 },
    { key: 'editcommand', name: '/editcommand', desc: 'Update an existing custom command.', category: 'Admin', syntax: '/editcommand name: <text> response: <text>', options: [{ name: 'name', type: 'string', required: true }, { name: 'response', type: 'string', required: true }], permissions: 'Administrator', examples: ['/editcommand name: rules response: Be nice!'], preview: { type: 'text', content: 'Custom command updated.' }, addedAt: 27 },
    { key: 'removecommand', name: '/removecommand', desc: 'Delete a custom command.', category: 'Admin', syntax: '/removecommand name: <text>', options: [{ name: 'name', type: 'string', required: true }], permissions: 'Administrator', examples: ['/removecommand name: rules'], preview: { type: 'text', content: 'Custom command removed.' }, addedAt: 28 },
    { key: 'addfilter', name: '/addfilter', desc: 'Suppress notifications with a keyword.', category: 'Admin', syntax: '/addfilter keyword: <text> type: <type>', options: [{ name: 'keyword', type: 'string', required: true }, { name: 'type', type: 'string', required: true }], permissions: 'Administrator', examples: ['/addfilter keyword: test type: title'], preview: { type: 'text', content: 'Filter added.' }, addedAt: 29 },
    { key: 'removefilter', name: '/removefilter', desc: 'Remove a notification filter.', category: 'Admin', syntax: '/removefilter filter_id: <id>', options: [{ name: 'filter_id', type: 'string', required: true }], permissions: 'Administrator', examples: ['/removefilter filter_123'], preview: { type: 'text', content: 'Filter removed.' }, addedAt: 30 }
  ];

  const categories = ['All', 'Info', 'Utility', 'Community', 'Moderation', 'Admin', 'Fun', 'Economy', 'Giveaways'];

  const now = Date.now();
  const withinMs = (ts, ms) => ts && now - ts <= ms;
  const formatUptime = (ms) => {
    const d = Math.floor(ms / (1000 * 60 * 60 * 24));
    const h = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${d}d ${h}h ${m}m`;
  };

  const commandsWithStats = commands.map(cmd => {
    const usage = commandUsage[cmd.key] || { total: 0, lastUsed: null, history: [], userCounts: {} };
    const history = Array.isArray(usage.history) ? usage.history : [];
    const weekUses = history.filter(h => withinMs(new Date(h.timestamp).getTime(), 7 * 24 * 60 * 60 * 1000)).length;
    const monthUses = history.filter(h => withinMs(new Date(h.timestamp).getTime(), 30 * 24 * 60 * 60 * 1000)).length;
    const dayUses = history.filter(h => withinMs(new Date(h.timestamp).getTime(), 24 * 60 * 60 * 1000)).length;
    const lastUsed = usage.lastUsed ? new Date(usage.lastUsed).toLocaleString() : 'Never';

    const userCounts = usage.userCounts || {};
    const topUserEntry = Object.entries(userCounts).sort((a, b) => (b[1].count || 0) - (a[1].count || 0))[0];
    const topUser = topUserEntry ? `@${topUserEntry[1].username} (${topUserEntry[1].count})` : '—';

    const cooldownMs = Number(config.commandCooldowns?.[cmd.key] || 0);
    const cooldownSec = cooldownMs ? Math.round(cooldownMs / 1000) : 0;
    const pinned = !!config.commandPinned?.[cmd.key];
    const disabled = !!config.commandDisabled?.[cmd.key];
    const requiresArgs = (cmd.options || []).some(o => o.required);
    const status = disabled ? 'disabled' : (cooldownSec > 0 ? 'cooldown' : 'enabled');

    const requiredOpts = (cmd.options || []).filter(o => o.required).map(o => `${o.name} (${o.type})`);
    const optionalOpts = (cmd.options || []).filter(o => !o.required).map(o => `${o.name} (${o.type})`);

    const optionText = requiredOpts.length || optionalOpts.length
      ? `${requiredOpts.length ? 'Required: ' + requiredOpts.join(', ') : ''}${requiredOpts.length && optionalOpts.length ? ' • ' : ''}${optionalOpts.length ? 'Optional: ' + optionalOpts.join(', ') : ''}`
      : 'No options';

    return {
      ...cmd,
      usesTotal: usage.total || 0,
      usesWeek: weekUses,
      usesMonth: monthUses,
      usesToday: dayUses,
      lastUsed,
      topUser,
      cooldownSec,
      pinned,
      disabled,
      status,
      requiresArgs,
      optionText
    };
  });

  const totalUses = commandsWithStats.reduce((sum, c) => sum + (c.usesTotal || 0), 0);
  const usesToday = commandsWithStats.reduce((sum, c) => sum + (c.usesToday || 0), 0);
  const activeServers = client?.guilds?.cache?.size ?? 0;
  const botUptime = formatUptime(Date.now() - startTime);

  const categoryCounts = {};
  categories.forEach(c => categoryCounts[c] = 0);
  commandsWithStats.forEach(cmd => {
    categoryCounts[cmd.category] = (categoryCounts[cmd.category] || 0) + 1;
    categoryCounts.All = (categoryCounts.All || 0) + 1;
  });

  const exampleData = {};
  commandsWithStats.forEach(cmd => {
    exampleData[cmd.key] = {
      name: cmd.name,
      examples: cmd.examples || [],
      preview: cmd.preview || { type: 'text', content: '' }
    };
  });
  const exampleJson = JSON.stringify(exampleData).replace(/</g, '\\u003c');

  let html = `
<div class="card">
  <h2>📖 Command Center</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:12px">
    <div style="padding:12px;background:#26262c;border-radius:8px">Bot uptime: <b>${botUptime}</b></div>
    <div style="padding:12px;background:#26262c;border-radius:8px">Commands today: <b>${usesToday}</b></div>
    <div style="padding:12px;background:#26262c;border-radius:8px">Active servers: <b>${activeServers}</b></div>
    <div style="padding:12px;background:#26262c;border-radius:8px">Commands used: <b>${totalUses}</b></div>
  </div>

  <div style="margin:16px 0">
    <input type="text" id="commandSearch" oninput="applyCommandFilters()" placeholder="🔍 Search commands..." style="width:100%;padding:10px;background:#2a2a2e;color:#fff;border:1px solid #3a3a42;border-radius:4px;font-size:14px">
  </div>

  <div class="command-filters">
    ${categories.map(cat => `
      <button onclick="setCommandCategory('${cat}')" class="filter-btn" data-category="${cat}" style="padding:5px 10px;background:${cat === 'All' ? '#9146ff' : '#4a4a5e'};color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:13px">${cat} (${categoryCounts[cat] || 0})</button>
    `).join('')}
  </div>

  <div style="display:flex;gap:10px;align-items:center;margin-bottom:18px;flex-wrap:wrap">
    <label style="font-size:13px;color:#b0b0b0">Sort by:</label>
    <select id="commandSort" onchange="applyCommandFilters()" style="width:200px">
      <option value="alphabetical">Alphabetical</option>
      <option value="popularity">Popularity</option>
      <option value="newest">Newest</option>
      <option value="cooldown">Cooldown</option>
      <option value="requiresArgs">Requires Args</option>
      <option value="pinned">Pinned</option>
    </select>
  </div>
</div>

<div class="cmd-grid" id="commandsGrid">
  ${commandsWithStats.map(cmd => {
    const statusDot = cmd.status === 'disabled' ? 'status-dot status-disabled' : cmd.status === 'cooldown' ? 'status-dot status-cooldown' : 'status-dot status-enabled';
    const badge = cmd.category === 'Admin' ? 'admin' : cmd.category === 'Community' ? 'community' : 'info';
    return `
    <div class="cmd-card" data-name="${cmd.name.toLowerCase()}" data-desc="${cmd.desc.toLowerCase()}" data-category="${cmd.category}" data-uses="${cmd.usesTotal}" data-added="${cmd.addedAt}" data-cooldown="${cmd.cooldownSec}" data-requires="${cmd.requiresArgs ? 1 : 0}" data-pinned="${cmd.pinned ? 1 : 0}" data-status="${cmd.status}">
      <div class="cmd-header">
        <div class="cmd-title">
          <span class="${statusDot}"></span>
          <span class="cmd-name" onclick="copyCommandName('${cmd.name}')" title="Click to copy">${cmd.name}</span>
        </div>
        <div class="cmd-actions">
          <button class="small" onclick="toggleCommandPinned('${cmd.key}')" title="Pin command" style="background:${cmd.pinned ? '#f7b731' : '#3a3a42'}">${cmd.pinned ? '★' : '☆'}</button>
          <button class="small" onclick="toggleCommandDisabled('${cmd.key}')" style="background:${cmd.disabled ? '#c43c3c' : '#3a3a42'}">${cmd.disabled ? 'Disabled' : 'Enabled'}</button>
          <button class="small" onclick="showCommandExample('${cmd.key}')">Examples</button>
        </div>
      </div>

      <div style="margin-top:6px">
        <span class="badge ${badge}">${cmd.category}</span>
      </div>

      <div class="desc" style="margin-top:6px">${cmd.desc}</div>
      <div class="usage" style="margin-top:8px">${cmd.syntax}</div>

      <div style="margin-top:8px;font-size:12px;color:#b0b0b0">${cmd.optionText}</div>
      <div style="margin-top:6px;font-size:12px;color:#b0b0b0">Permissions: <b>${cmd.permissions}</b></div>

      <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:#c9c9c9">
        <div>Uses: <b>${cmd.usesTotal}</b></div>
        <div>Last used: <b>${cmd.lastUsed}</b></div>
        <div>Week: <b>${cmd.usesWeek}</b> • Month: <b>${cmd.usesMonth}</b></div>
        <div>Top user: <b>${cmd.topUser}</b></div>
      </div>

      <div style="margin-top:10px;display:flex;gap:8px;align-items:center">
        <input type="number" id="cooldown-${cmd.key}" min="0" placeholder="Cooldown (sec)" value="${cmd.cooldownSec || ''}" style="width:140px">
        <button class="small" onclick="saveCommandCooldown('${cmd.key}')">Save</button>
      </div>
    </div>`;
  }).join('')}
</div>

<script>
window.commandExampleData = ${exampleJson};
window.commandCategoryOrder = ${JSON.stringify(categories)};

let activeCategory = 'All';

function setCommandCategory(category) {
  activeCategory = category;
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => {
    if (btn.dataset.category === category) {
      btn.style.background = '#9146ff';
    } else {
      btn.style.background = '#4a4a5e';
    }
  });
  applyCommandFilters();
}

function applyCommandFilters() {
  const searchTerm = (document.getElementById('commandSearch')?.value || '').toLowerCase();
  const sortBy = document.getElementById('commandSort')?.value || 'alphabetical';
  const cards = Array.from(document.querySelectorAll('.cmd-card'));

  let visible = cards.filter(card => {
    const name = card.dataset.name || '';
    const desc = card.dataset.desc || '';
    const category = card.dataset.category || '';
    const matchesSearch = name.includes(searchTerm) || desc.includes(searchTerm) || category.toLowerCase().includes(searchTerm);
    const matchesCategory = activeCategory === 'All' || category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  visible.sort((a, b) => {
    const pinnedA = parseInt(a.dataset.pinned || '0', 10);
    const pinnedB = parseInt(b.dataset.pinned || '0', 10);
    if (sortBy === 'pinned' && pinnedA !== pinnedB) return pinnedB - pinnedA;

    if (sortBy === 'popularity') return parseInt(b.dataset.uses || '0', 10) - parseInt(a.dataset.uses || '0', 10);
    if (sortBy === 'newest') return parseInt(b.dataset.added || '0', 10) - parseInt(a.dataset.added || '0', 10);
    if (sortBy === 'cooldown') return parseInt(b.dataset.cooldown || '0', 10) - parseInt(a.dataset.cooldown || '0', 10);
    if (sortBy === 'requiresArgs') return parseInt(b.dataset.requires || '0', 10) - parseInt(a.dataset.requires || '0', 10);
    return (a.dataset.name || '').localeCompare(b.dataset.name || '');
  });

  const container = document.getElementById('commandsGrid');
  container.innerHTML = '';
  container.classList.toggle('cmd-sections', activeCategory === 'All');
  container.classList.toggle('cmd-grid', activeCategory !== 'All');

  if (activeCategory === 'All') {
    const categoryOrder = (window.commandCategoryOrder || []).filter(c => c !== 'All');
    const grouped = new Map();
    visible.forEach(card => {
      const cat = card.dataset.category || 'Other';
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat).push(card);
    });

    categoryOrder.forEach(cat => {
      const group = grouped.get(cat);
      if (!group || group.length === 0) return;
      const section = document.createElement('div');
      section.className = 'cmd-section';
      const header = document.createElement('div');
      header.className = 'cmd-section-title';
      header.textContent = cat;
      const grid = document.createElement('div');
      grid.className = 'cmd-section-grid';
      group.forEach(card => grid.appendChild(card));
      section.appendChild(header);
      section.appendChild(grid);
      container.appendChild(section);
      grouped.delete(cat);
    });

    grouped.forEach((group, cat) => {
      const section = document.createElement('div');
      section.className = 'cmd-section';
      const header = document.createElement('div');
      header.className = 'cmd-section-title';
      header.textContent = cat;
      const grid = document.createElement('div');
      grid.className = 'cmd-section-grid';
      group.forEach(card => grid.appendChild(card));
      section.appendChild(header);
      section.appendChild(grid);
      container.appendChild(section);
    });
  } else {
    visible.forEach(card => container.appendChild(card));
  }
}

function saveCommandCooldown(commandKey) {
  const input = document.getElementById('cooldown-' + commandKey);
  const cooldownSeconds = input ? input.value : '';
  fetch('/commands/cooldown', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: commandKey, cooldownSeconds })
  }).then(r => r.json()).then(data => {
    if (data.success) {
      const card = document.querySelector('.cmd-card[data-name="/' + commandKey + '"]') || document.querySelector('.cmd-card[data-name="/' + commandKey.toLowerCase() + '"]');
      if (card) {
        const sec = parseInt(cooldownSeconds || '0', 10) || 0;
        card.dataset.cooldown = String(sec);
        card.dataset.status = sec > 0 ? 'cooldown' : 'enabled';
        const dot = card.querySelector('.status-dot');
        if (dot) {
          dot.classList.remove('status-enabled', 'status-cooldown', 'status-disabled');
          dot.classList.add(sec > 0 ? 'status-cooldown' : 'status-enabled');
        }
      }
      applyCommandFilters();
    } else {
      alert(data.error || 'Failed to update cooldown');
    }
  });
}

function toggleCommandPinned(commandKey) {
  const card = document.querySelector('.cmd-card[data-name="/' + commandKey + '"]') || document.querySelector('.cmd-card[data-name="/' + commandKey.toLowerCase() + '"]');
  const isPinned = card ? card.dataset.pinned === '1' : false;
  fetch('/commands/pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: commandKey, pinned: !isPinned })
  }).then(r => r.json()).then(data => {
    if (data.success && card) {
      card.dataset.pinned = !isPinned ? '1' : '0';
      applyCommandFilters();
      location.reload();
    }
  });
}

function toggleCommandDisabled(commandKey) {
  const card = document.querySelector('.cmd-card[data-name="/' + commandKey + '"]') || document.querySelector('.cmd-card[data-name="/' + commandKey.toLowerCase() + '"]');
  const isDisabled = card ? card.dataset.status === 'disabled' : false;
  fetch('/commands/disable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: commandKey, disabled: !isDisabled })
  }).then(r => r.json()).then(data => {
    if (data.success) location.reload();
  });
}

function showCommandExample(commandKey) {
  const data = window.commandExampleData?.[commandKey];
  if (!data) return;
  let examplesHtml = '';
  if (Array.isArray(data.examples) && data.examples.length) {
    examplesHtml = '<div style="margin-top:10px;color:#b0b0b0;font-size:12px">' + data.examples.map(e => '<div>• ' + String(e) + '</div>').join('') + '</div>';
  }

  let previewHtml = '';
  if (data.preview?.type === 'embed') {
    previewHtml =
      '<div style="margin-top:12px;background:#2a2f3a;border-left:4px solid #9146ff;padding:12px;border-radius:6px">' +
        '<div style="font-weight:600;color:#fff">' + (data.preview.title || 'Example Embed') + '</div>' +
        '<div style="margin-top:6px;color:#d0d0d0;white-space:pre-wrap">' + (data.preview.description || '') + '</div>' +
      '</div>';
  } else {
    previewHtml =
      '<div style="margin-top:12px;background:#2a2f3a;padding:10px;border-radius:6px;color:#d0d0d0;white-space:pre-wrap">' +
        (data.preview?.content || '') +
      '</div>';
  }

  const html =
    '<div>' +
      '<h3 style="margin:0 0 6px 0;font-size:18px">' + data.name + ' Examples</h3>' +
      examplesHtml +
      previewHtml +
      '<div style="display:flex;justify-content:flex-end;margin-top:12px">' +
        '<button onclick="closeModal()" class="small" style="background:#3a3a42">Close</button>' +
      '</div>' +
    '</div>';
  showCustomModal(html);
}

function copyCommandName(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  }
}

applyCommandFilters();
</script>`;

  return html;
}

// NEW: Settings tab
function renderNotificationRoleInputs() {
  const { stats, client, commandUsage, dashboardSettings, giveaways, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, startTime, welcomeSettings, xpMultiplier, youtubeAlerts, loadJSON, SCHED_MSG_PATH, DATA_DIR, config, levelingConfig, customCommands, engagementSettings, streamInfo, weeklyLeveling, notificationHistory, notificationFilters } = _getState();
  const notifTypes = [
    { key: 'liveAlert', label: '🔴 Stream Goes Live' },
    { key: 'scheduleAlert', label: '⏰ Schedule Alert' },
    { key: 'titleChange', label: '📝 Title Changed' },
    { key: 'gameChange', label: '🎮 Game Changed' },
    { key: 'vodNotification', label: '📹 VOD Available' },
    { key: 'raidNotification', label: '⚔️ Raid Received' },
    { key: 'clipNotification', label: '🎬 Clip Created' },
    { key: 'followerMilestone', label: '👥 Follower Milestone' },
    { key: 'viewerMilestone', label: '👀 Viewer Milestone' }
  ];
  
  return notifTypes.map(t => {
    const isEnabled = config.notificationEnabled[t.key] !== false; // default true
    const pingEnabled = config.notificationPing[t.key] !== false; // default true
    
    return `
    <div style="margin-bottom:16px;padding:12px;background:#26262c;border-radius:10px">
      <label style="display:block;margin-bottom:8px"><b>${t.label}</b></label>
      <div style="display:grid;grid-template-columns:0.6fr 300px 72px;gap:10px;align-items:center;margin-bottom:10px">
        <input type="text" id="notif-${t.key}" value="${config.notificationRoles[t.key] || ''}" placeholder="Role ID (optional)" style="width:100%;padding:14px 16px;border:1px solid #3a3a42;border-radius:10px;background:#1d2028;color:#ffffff;font-size:14px;caret-color:#ffffff;">
        <span id="notif-display-${t.key}" style="padding:8px;background:#3a3a42;border-radius:8px;min-height:28px;display:flex;align-items:center;font-size:12px;justify-content:center"></span>
        <button onclick="saveNotificationRole('${t.key}')" style="padding:4px 6px;font-size:10px;line-height:1;white-space:nowrap;height:28px;border-radius:8px;">Save</button>
      </div>
      <div style="display:grid;grid-template-columns:0.6fr 300px 72px;gap:10px;align-items:center;margin-bottom:10px">
        <input type="text" id="channel-${t.key}" value="${config.notificationChannels[t.key] || ''}" placeholder="Channel ID (optional)" style="width:100%;padding:14px 16px;border:1px solid #3a3a42;border-radius:10px;background:#1d2028;color:#ffffff;font-size:14px;caret-color:#ffffff;">
        <span id="channel-display-${t.key}" style="padding:8px;background:#3a3a42;border-radius:8px;min-height:28px;display:flex;align-items:center;font-size:12px;justify-content:center"></span>
        <button onclick="saveNotificationChannel('${t.key}')" style="padding:4px 6px;font-size:10px;line-height:1;white-space:nowrap;height:28px;border-radius:8px;">Save</button>
      </div>
      <div style="display:flex;gap:20px;font-size:13px">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="checkbox" id="enable-${t.key}" ${isEnabled ? 'checked' : ''} onchange="toggleNotificationEnabled('${t.key}')" style="width:16px;height:16px;cursor:pointer">
          <span>Enable Notification</span>
        </label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="checkbox" id="ping-${t.key}" ${pingEnabled ? 'checked' : ''} onchange="toggleNotificationPing('${t.key}')" style="width:16px;height:16px;cursor:pointer">
          <span>Enable Ping</span>
        </label>
      </div>
    </div>
  `;
  }).join('');
}

export function renderConfigGeneralTab() {
  const { stats, client, commandUsage, dashboardSettings, giveaways, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, startTime, welcomeSettings, xpMultiplier, youtubeAlerts, loadJSON, SCHED_MSG_PATH, DATA_DIR, config, levelingConfig, customCommands, engagementSettings, streamInfo, weeklyLeveling, notificationHistory, notificationFilters } = _getState();
  return `
  <div class="card">
    <h2 style="margin-bottom:4px">⚙️ General Settings</h2>
    <p style="color:#72767d;font-size:13px;margin-top:0">Core bot configuration — role, channels, and identity settings</p>

    <div style="display:grid;gap:18px;margin-top:18px">
      <div style="padding:14px;background:#26262c;border-radius:10px">
        <label style="display:block;margin-bottom:6px;font-weight:600;font-size:13px">🎭 Primary Notification Role</label>
        <div style="display:grid;grid-template-columns:1fr 280px 64px;gap:10px;align-items:center">
          <input type="text" id="role" value="${config.ROLE_ID || ''}" placeholder="Role ID" style="padding:12px 14px;border:1px solid #3a3a42;border-radius:8px;background:#1d2028;color:#fff;font-size:14px">
          <span id="roleDisplay" style="padding:8px 12px;background:#3a3a42;border-radius:8px;display:flex;align-items:center;font-size:12px;min-height:28px;justify-content:center"></span>
          <button onclick="saveRole()" style="padding:6px 10px;font-size:11px;height:32px;border-radius:8px">Save</button>
        </div>
      </div>

      <div style="padding:14px;background:#26262c;border-radius:10px">
        <label style="display:block;margin-bottom:6px;font-weight:600;font-size:13px">📢 Custom Notification Channel</label>
        <div style="display:grid;grid-template-columns:1fr 280px 64px;gap:10px;align-items:center">
          <input type="text" id="customChannel" value="${config.CUSTOM_CHANNEL_ID || ''}" placeholder="Channel ID (optional)" style="padding:12px 14px;border:1px solid #3a3a42;border-radius:8px;background:#1d2028;color:#fff;font-size:14px">
          <span id="channelDisplay" style="padding:8px 12px;background:#3a3a42;border-radius:8px;display:flex;align-items:center;font-size:12px;min-height:28px;justify-content:center"></span>
          <button onclick="saveCustomChannel()" style="padding:6px 10px;font-size:11px;height:32px;border-radius:8px">Save</button>
        </div>
        <div style="color:#72767d;font-size:11px;margin-top:6px">Leave blank to use the channel where the bot was set up.</div>
      </div>

      <div style="padding:14px;background:#26262c;border-radius:10px">
        <label style="display:block;margin-bottom:6px;font-weight:600;font-size:13px">📺 Twitch Channel</label>
        <div style="display:grid;grid-template-columns:1fr 280px 64px;gap:10px;align-items:center">
          <input type="text" id="twitchChannel" value="${config.TWITCH_CHANNEL || ''}" placeholder="Channel name" style="padding:12px 14px;border:1px solid #3a3a42;border-radius:8px;background:#1d2028;color:#fff;font-size:14px">
          <span></span>
          <button onclick="saveTwitchChannel()" style="padding:6px 10px;font-size:11px;height:32px;border-radius:8px">Save</button>
        </div>
      </div>

      <div style="padding:14px;background:#26262c;border-radius:10px">
        <label style="display:block;margin-bottom:6px;font-weight:600;font-size:13px">🕒 Bot Timezone</label>
        <div style="display:grid;grid-template-columns:1fr 64px;gap:10px;align-items:center">
          <select id="botTimezone" onchange="updateSetting('BOT_TIMEZONE', this.value)" style="padding:12px 14px;border:1px solid #3a3a42;border-radius:8px;background:#1d2028;color:#fff;font-size:14px">
            <option value="UTC" ${(config.BOT_TIMEZONE||'UTC')==='UTC'?'selected':''}>UTC</option>
            <option value="America/New_York" ${(config.BOT_TIMEZONE||'')==='America/New_York'?'selected':''}>Eastern (ET)</option>
            <option value="America/Chicago" ${(config.BOT_TIMEZONE||'')==='America/Chicago'?'selected':''}>Central (CT)</option>
            <option value="America/Denver" ${(config.BOT_TIMEZONE||'')==='America/Denver'?'selected':''}>Mountain (MT)</option>
            <option value="America/Los_Angeles" ${(config.BOT_TIMEZONE||'')==='America/Los_Angeles'?'selected':''}>Pacific (PT)</option>
            <option value="Europe/London" ${(config.BOT_TIMEZONE||'')==='Europe/London'?'selected':''}>London (GMT/BST)</option>
            <option value="Europe/Paris" ${(config.BOT_TIMEZONE||'')==='Europe/Paris'?'selected':''}>Paris (CET)</option>
            <option value="Asia/Tokyo" ${(config.BOT_TIMEZONE||'')==='Asia/Tokyo'?'selected':''}>Tokyo (JST)</option>
            <option value="Australia/Sydney" ${(config.BOT_TIMEZONE||'')==='Australia/Sydney'?'selected':''}>Sydney (AEST)</option>
          </select>
          <span></span>
        </div>
      </div>
    </div>
  </div>

<script>
function displayRoleInfo(roleId, displayId) {
  const id = (roleId || '').trim();
  if (!id) { document.getElementById(displayId).textContent = 'Not set'; return; }
  fetch(window.location.origin + '/role/info/' + encodeURIComponent(id))
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(data => {
      if (data.name) {
        const color = data.hexColor || '#ffffff';
        document.getElementById(displayId).innerHTML = '<span style="color:' + color + '">●</span> ' + data.name;
      } else { document.getElementById(displayId).textContent = 'Invalid role'; }
    })
    .catch(err => document.getElementById(displayId).textContent = 'Error: ' + err.message);
}
function displayChannelInfo(channelId, displayId) {
  const id = (channelId || '').trim();
  if (!id) { document.getElementById(displayId).textContent = 'Not set'; return; }
  fetch(window.location.origin + '/channel/info/' + encodeURIComponent(id))
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(data => {
      if (data.name) {
        document.getElementById(displayId).innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px;white-space:nowrap"><span style="display:inline-flex;align-items:center;gap:4px">#' + data.name + '</span><span style="color:#888;font-size:11px">(' + data.id + ')</span></span>';
      } else { document.getElementById(displayId).textContent = 'Invalid channel'; }
    })
    .catch(err => document.getElementById(displayId).textContent = 'Error: ' + err.message);
}
function saveRole(){
  const roleId = document.getElementById('role').value;
  fetch('/options/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ROLE_ID:roleId})})
    .then(()=>{ alert('Saved'); displayRoleInfo(roleId,'roleDisplay'); });
}
function saveCustomChannel(){
  const channelId = document.getElementById('customChannel').value;
  fetch('/options/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({CUSTOM_CHANNEL_ID:channelId})})
    .then(()=>{ alert('Saved'); displayChannelInfo(channelId,'channelDisplay'); });
}
function saveTwitchChannel(){
  const ch = document.getElementById('twitchChannel').value;
  fetch('/options/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({TWITCH_CHANNEL:ch})})
    .then(()=>alert('Saved'));
}
function updateSetting(key, value) {
  fetch('/settings/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,value})}).then(()=>alert('Setting updated'));
}
window.addEventListener('load', () => {
  displayRoleInfo(document.getElementById('role').value, 'roleDisplay');
  displayChannelInfo(document.getElementById('customChannel')?.value, 'channelDisplay');
});
</script>`;
}

export function renderConfigNotificationsTab() {
  const { stats, client, commandUsage, dashboardSettings, giveaways, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, startTime, welcomeSettings, xpMultiplier, youtubeAlerts, loadJSON, SCHED_MSG_PATH, DATA_DIR, config, levelingConfig, customCommands, engagementSettings, streamInfo, weeklyLeveling, notificationHistory, notificationFilters } = _getState();
  return `
  <div class="card">
    <h2 style="margin-bottom:4px">🔔 Notification Settings</h2>
    <p style="color:#72767d;font-size:13px;margin-top:0">Configure which notifications are sent, their roles, and destination channels</p>
    <p style="color:#b0b0b0;font-size:12px;margin-bottom:20px">If a role or channel is empty, the primary role and default channel are used.</p>
    ${renderNotificationRoleInputs()}
  </div>

  <div class="card">
    <h2>📊 Stream Info</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
      <div style="padding:12px;background:#26262c;border-radius:8px">
        <div style="color:#72767d;font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Title</div>
        <div style="font-size:14px">${streamInfo.title || 'N/A'}</div>
      </div>
      <div style="padding:12px;background:#26262c;border-radius:8px">
        <div style="color:#72767d;font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Game</div>
        <div style="font-size:14px">${streamInfo.game || 'N/A'}</div>
      </div>
      <div style="padding:12px;background:#26262c;border-radius:8px">
        <div style="color:#72767d;font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Viewers</div>
        <div style="font-size:14px">${streamInfo.viewers || '0'}</div>
      </div>
      <div style="padding:12px;background:#26262c;border-radius:8px">
        <div style="color:#72767d;font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Status</div>
        <div style="font-size:14px">${streamInfo.startedAt ? '🔴 LIVE' : '⚫ OFFLINE'}</div>
      </div>
    </div>
  </div>

<script>
function displayRoleInfo(roleId, displayId) {
  const id = (roleId || '').trim();
  if (!id) { document.getElementById(displayId).textContent = 'Not set'; return; }
  fetch(window.location.origin + '/role/info/' + encodeURIComponent(id))
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(data => {
      if (data.name) {
        const color = data.hexColor || '#ffffff';
        document.getElementById(displayId).innerHTML = '<span style="color:' + color + '">●</span> ' + data.name;
      } else { document.getElementById(displayId).textContent = 'Invalid role'; }
    })
    .catch(err => document.getElementById(displayId).textContent = 'Error: ' + err.message);
}
function displayChannelInfo(channelId, displayId) {
  const id = (channelId || '').trim();
  if (!id) { document.getElementById(displayId).textContent = 'Not set'; return; }
  fetch(window.location.origin + '/channel/info/' + encodeURIComponent(id))
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(data => {
      if (data.name) {
        document.getElementById(displayId).innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px;white-space:nowrap"><span style="display:inline-flex;align-items:center;gap:4px">#' + data.name + '</span><span style="color:#888;font-size:11px">(' + data.id + ')</span></span>';
      } else { document.getElementById(displayId).textContent = 'Invalid channel'; }
    })
    .catch(err => document.getElementById(displayId).textContent = 'Error: ' + err.message);
}
function saveNotificationRole(key){
  const roleId = document.getElementById('notif-' + key).value;
  const notificationRoles = {}; notificationRoles[key] = roleId;
  fetch('/options/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({notificationRoles})})
    .then(()=>{ alert('Saved'); displayRoleInfo(roleId, 'notif-display-' + key); });
}
function toggleNotificationEnabled(key) {
  const isEnabled = document.getElementById('enable-' + key).checked;
  const notificationEnabled = {}; notificationEnabled[key] = isEnabled;
  fetch('/options/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({notificationEnabled})})
    .then(()=>console.log('Notification ' + key + ' ' + (isEnabled ? 'enabled' : 'disabled')));
}
function toggleNotificationPing(key) {
  const pingEnabled = document.getElementById('ping-' + key).checked;
  const notificationPing = {}; notificationPing[key] = pingEnabled;
  fetch('/options/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({notificationPing})})
    .then(()=>console.log('Ping for ' + key + ' ' + (pingEnabled ? 'enabled' : 'disabled')));
}
function saveNotificationChannel(key) {
  const channelId = document.getElementById('channel-' + key).value;
  const notificationChannels = {}; notificationChannels[key] = channelId;
  fetch('/options/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({notificationChannels})})
    .then(()=>{ alert('Saved'); displayChannelInfo(channelId, 'channel-display-' + key); });
}
window.addEventListener('load', () => {
  document.querySelectorAll('[id^="notif-"]').forEach(el => {
    if (el.id.startsWith('notif-') && !el.id.startsWith('notif-display-')) {
      const key = el.id.replace('notif-', '');
      displayRoleInfo(el.value, 'notif-display-' + key);
    }
  });
  document.querySelectorAll('[id^="channel-"]').forEach(el => {
    if (el.id.startsWith('channel-') && !el.id.startsWith('channel-display-')) {
      const key = el.id.replace('channel-', '');
      displayChannelInfo(el.value, 'channel-display-' + key);
    }
  });
});
</script>`;
}

export function renderConfigTab() {
  const { stats, client, commandUsage, dashboardSettings, giveaways, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, startTime, welcomeSettings, xpMultiplier, youtubeAlerts, loadJSON, SCHED_MSG_PATH, DATA_DIR, config, levelingConfig, customCommands, engagementSettings, streamInfo, weeklyLeveling, notificationHistory, notificationFilters } = _getState();
  return renderConfigGeneralTab();
}

export function renderSettingsTab() {
  const { stats, client, commandUsage, dashboardSettings, giveaways, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, startTime, welcomeSettings, xpMultiplier, youtubeAlerts, loadJSON, SCHED_MSG_PATH, DATA_DIR, config, levelingConfig, customCommands, engagementSettings, streamInfo, weeklyLeveling, notificationHistory, notificationFilters } = _getState();
  return renderConfigTab();
}

export function renderCommandsTabContent() {
  const { stats, client, commandUsage, dashboardSettings, giveaways, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, startTime, welcomeSettings, xpMultiplier, youtubeAlerts, loadJSON, SCHED_MSG_PATH, DATA_DIR, config, levelingConfig, customCommands, engagementSettings, streamInfo, weeklyLeveling, notificationHistory, notificationFilters } = _getState();
  return renderCommandsTab();
}

// Helper to safely escape JSON for embedding in HTML (avoids script-breaking chars)
export function safeJsonForHtml(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

// NEW: Leveling tab
export function renderLevelingTab() {
  const { stats, client, commandUsage, dashboardSettings, giveaways, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, startTime, welcomeSettings, xpMultiplier, youtubeAlerts, loadJSON, SCHED_MSG_PATH, DATA_DIR, config, levelingConfig, customCommands, engagementSettings, streamInfo, weeklyLeveling, notificationHistory, notificationFilters, membersCache } = _getState();
  const top = Object.entries(leveling)
    .sort((a, b) => (b[1].level - a[1].level) || (b[1].xp - a[1].xp))
    .slice(0, 20);
  
  const prestigeData = {};
  
  // Build usernames map from cached data
  const userNameCache = {};
  Object.entries(membersCache?.members || {}).forEach(([id, m]) => { userNameCache[id] = m.displayName || m.username || ('User-' + id.slice(-4)); });
  const usernames = {};
  Object.keys(leveling).forEach(id => {
    usernames[id] = userNameCache[id] || id;
  });
  
  return `
<div class="card" style="margin-bottom:20px">
  <div style="display:flex;gap:8px;flex-wrap:wrap;border-bottom:2px solid #3a3a42;padding-bottom:10px">
    <button class="small" id="tab-leaderboard" style="width:auto;background:#9146ff;color:white">🏆 Leaderboard</button>
    <button class="small" id="tab-prestige" style="width:auto;background:#2a2f3a;color:white">🎖️ Prestige</button>
    <button class="small" id="tab-settings" style="width:auto;background:#2a2f3a;color:white">⚙️ Settings</button>
    <button class="small" id="tab-rewards" style="width:auto;background:#2a2f3a;color:white">🎁 Rewards</button>
    <button class="small" id="tab-config" style="width:auto;background:#2a2f3a;color:white">🔧 Config</button>
  </div>
</div>

<div id="section-leaderboard" data-leveling-section>
  <!-- Stats Overview Cards -->
  <div class="card">
    <h2>📊 Server Leveling Overview</h2>
    <div id="levelingStatsCards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:16px 0"></div>
    <a href="/stats?tab=stats-community" style="display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:6px 14px;background:#2a2f3a;border:1px solid #3a3a42;border-radius:6px;color:#9146ff;font-size:12px;font-weight:600;text-decoration:none">📈 View Charts & Analytics →</a>
  </div>

  <div class="card">
    <h2>🏆 Level Leaderboard</h2>

    <div class="leaderboard-controls">
      <div class="leaderboard-row">
        <label style="color:#b0b0b0;font-size:12px">View:
          <select id="leaderboardView">
            <option value="all">All time</option>
            <option value="week">This week only</option>
          </select>
        </label>
        <label style="color:#b0b0b0;font-size:12px">Page size:
          <select id="leaderboardPageSize">
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>
        <label class="leaderboard-checkbox"><input type="checkbox" id="leaderboardPrestigeOnly"> Prestige only</label>
        <label class="leaderboard-checkbox"><input type="checkbox" id="leaderboardExcludeBots"> Exclude bots &amp; admins</label>
      </div>

      <div class="leaderboard-row">
        <input id="leaderboardSearch" placeholder="Search @user or ID" style="flex:1;min-width:200px">
        <button class="small" id="leaderboardSearchBtn" style="width:auto">Find</button>
        <button class="small" id="leaderboardClearSearchBtn" style="width:auto;background:#3a3a42">Clear</button>
        <div class="leaderboard-spacer"></div>
        <input id="leaderboardExportCount" type="number" min="20" value="100" style="width:120px" title="Export count">
        <button class="small" id="leaderboardExportBtn" style="width:auto">Export CSV</button>
        <button class="small" id="leaderboardImportBtn" style="width:auto;background:#4caf50">Import CSV</button>
        <input id="leaderboardImportFile" type="file" accept=".csv,text/csv" style="display:none">
      </div>
    </div>

    <div id="leaderboardCount" style="color:#b0b0b0;font-size:12px;margin-bottom:8px"></div>

    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#26262c;position:sticky;top:0">
            <th style="padding:10px;text-align:left;border-bottom:2px solid #3a3a42">Rank</th>
            <th style="padding:10px;text-align:left;border-bottom:2px solid #3a3a42">User</th>
            <th style="padding:10px;text-align:center;border-bottom:2px solid #3a3a42">Level</th>
            <th id="leaderboardXpHeader" style="padding:10px;text-align:center;border-bottom:2px solid #3a3a42">XP</th>
            <th style="padding:10px;text-align:center;border-bottom:2px solid #3a3a42">XP %</th>
            <th style="padding:10px;text-align:center;border-bottom:2px solid #3a3a42">Prestige</th>
            <th style="padding:10px;text-align:center;border-bottom:2px solid #3a3a42">Multiplier</th>
            <th style="padding:10px;text-align:center;border-bottom:2px solid #3a3a42">Actions</th>
          </tr>
        </thead>
        <tbody id="leaderboardBody"></tbody>
      </table>
    </div>

    <div class="leaderboard-pagination">
      <button class="small" id="leaderboardPrevPage" style="width:auto;background:#3a3a42">Prev</button>
      <select id="leaderboardPageSelect" style="width:auto"></select>
      <button class="small" id="leaderboardNextPage" style="width:auto;background:#3a3a42">Next</button>
      <button class="small" id="leaderboardLoadMore" style="width:auto">Load next 20</button>
      <span id="leaderboardRange" style="color:#b0b0b0;font-size:12px"></span>
    </div>
  </div>
</div>

<div id="section-prestige" data-leveling-section style="display:none">
  <div class="card">
    <h2>🎖️ Prestige Management</h2>
    <p style="color:#b0b0b0;margin-bottom:15px">Manage user prestige ranks and resets</p>
    
    <div style="padding:15px;background:#26262c;border-radius:6px;margin-bottom:15px">
      <h3 style="margin-top:0">Grant Prestige</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px;position:relative">
          <input id="prestigeUserId" placeholder="Start typing a username..." style="width:100%" autocomplete="off" oninput="autocompleteUserInput(this,'prestigeUserSuggestions')">
          <div id="prestigeUserSuggestions" style="display:none;position:absolute;top:100%;left:0;right:0;background:#1e1f22;border:1px solid #3a3a42;border-radius:0 0 6px 6px;max-height:140px;overflow-y:auto;z-index:100"></div>
        </div>
        <input id="prestigeLevel" type="number" min="0" placeholder="Prestige Level" style="flex:1;min-width:150px">
        <button class="small" id="prestigeGrantBtn" style="width:auto">Grant</button>
      </div>
      <small style="color:#999;display:block;margin-top:8px">Manually set a user's prestige rank (level is preserved)</small>
    </div>
    
    <div style="padding:15px;background:#26262c;border-radius:6px">
      <h3 style="margin-top:0">Reset User Level</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px;position:relative">
          <input id="resetUserId" placeholder="Start typing a username..." style="width:100%" autocomplete="off" oninput="autocompleteUserInput(this,'resetUserSuggestions')">
          <div id="resetUserSuggestions" style="display:none;position:absolute;top:100%;left:0;right:0;background:#1e1f22;border:1px solid #3a3a42;border-radius:0 0 6px 6px;max-height:140px;overflow-y:auto;z-index:100"></div>
        </div>
        <button class="small" id="resetLevelBtn" style="width:auto">Reset Level</button>
      </div>
      <small style="color:#999;display:block;margin-top:8px">Resets level and XP to 0 without changing prestige</small>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-top:0">⚡ Progressive Prestige Thresholds</h3>
    <p style="font-size:12px;color:#b0b0b0;margin-bottom:10px">Set level milestones where users earn their next prestige rank. <b>No level reset</b> — XP requirements scale up exponentially as users advance.</p>
    <div id="prestigeThresholdsList" style="margin-bottom:15px"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:15px">
      <input id="newPrestigeRank" type="number" min="1" placeholder="Prestige Rank" style="flex:1;min-width:120px">
      <input id="newPrestigeLvl" type="number" min="1" placeholder="Level to Reach" value="115" style="flex:1;min-width:120px">
      <div style="flex:1;min-width:150px;position:relative">
        <select id="newPrestigeRoleId" style="width:100%;background:#1e1f22;color:#e0e0e0;border:1px solid #444;border-radius:6px;padding:6px 8px;font-size:13px"><option value="">Role (optional)</option></select>
        <div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap" id="prestigeRoleFilter">
          <button type="button" class="small" style="padding:2px 8px;font-size:10px;width:auto;background:#2a2f3a" onclick="filterPrestigeRoles('')">All</button>
          <button type="button" class="small" style="padding:2px 8px;font-size:10px;width:auto;background:#2a2f3a" onclick="filterPrestigeRoles('P1')">P1</button>
          <button type="button" class="small" style="padding:2px 8px;font-size:10px;width:auto;background:#2a2f3a" onclick="filterPrestigeRoles('P2')">P2</button>
          <button type="button" class="small" style="padding:2px 8px;font-size:10px;width:auto;background:#2a2f3a" onclick="filterPrestigeRoles('P3')">P3</button>
        </div>
      </div>
      <button class="small" id="prestigeAddBtn" style="width:auto">Add</button>
    </div>
    <small id="prestigeRoleName" style="color:#888;display:block;margin-bottom:15px"></small>
    
    <div style="padding:12px;background:#1a2a1a;border-radius:4px;border-left:3px solid #4caf50;margin-top:10px">
      <small style="color:#4caf50"><b>How it works:</b> Users keep their level and XP. When reaching a threshold, they earn a prestige rank. Levels after each threshold require exponentially more XP (15% more per level in ramp zone, 50% more per prestige tier).</small>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-top:0">🎁 Prestige Benefits</h3>
    <p style="font-size:12px;color:#b0b0b0;margin-bottom:10px">Define perks for each prestige level (displayed on leaderboard)</p>
    <div id="prestigeBenefitsList" style="margin-bottom:15px;max-height:400px;overflow-y:auto"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;padding:12px;background:#26262c;border-radius:6px">
      <input id="benefitPrestigeRank" type="number" min="1" placeholder="Prestige Rank" style="flex:0 0 120px">
      <input id="benefitXpMultiplier" type="number" min="0" step="0.1" placeholder="XP Multiplier (+%)" style="flex:0 0 140px">
      <input id="benefitDescription" placeholder="Perk description" style="flex:1;min-width:200px">
      <button class="small" id="addBenefitBtn" style="width:auto">Add Benefit</button>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-top:0"> Prestige History</h3>
    <p style="font-size:12px;color:#b0b0b0;margin-bottom:10px">Recent prestige promotions</p>
    <div id="prestigeHistoryList" style="max-height:300px;overflow-y:auto;border:1px solid #3a3a42;border-radius:4px;padding:10px">
      <div style="color:#888;text-align:center;padding:20px">Loading history...</div>
    </div>
  </div>
</div>

<div id="section-settings" data-leveling-section style="display:none">
  <div class="card">
    <div style="max-width:980px;margin:0 auto">
      <h2>⚙️ XP Settings</h2>
      <div style="padding:15px;background:#26262c;border-radius:6px;margin-bottom:15px">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-bottom:15px">
          <div>
            <label style="display:block;margin-bottom:5px;font-weight:bold">XP per message (min)</label>
            <input id="xpMin" type="number" min="0" value="${levelingConfig?.xpPerMessageMin ?? 15}" style="width:100%;box-sizing:border-box">
          </div>
          <div>
            <label style="display:block;margin-bottom:5px;font-weight:bold">XP per message (max)</label>
            <input id="xpMax" type="number" min="0" value="${levelingConfig?.xpPerMessageMax ?? 25}" style="width:100%;box-sizing:border-box">
          </div>
          <div>
            <label style="display:block;margin-bottom:5px;font-weight:bold">Message cooldown (seconds)</label>
            <input id="cooldown" type="number" min="0" value="${Math.round((levelingConfig?.messageCooldownMs ?? 45000)/1000)}" style="width:100%;box-sizing:border-box">
          </div>
          <div>
            <label style="display:block;margin-bottom:5px;font-weight:bold">XP per voice minute</label>
            <input id="voiceXp" type="number" min="0" value="${levelingConfig?.xpPerVoiceMinute ?? 5}" style="width:100%;box-sizing:border-box">
          </div>
          <div>
            <label style="display:block;margin-bottom:5px;font-weight:bold">XP per reaction</label>
            <input id="reactionXp" type="number" min="0" value="${levelingConfig?.xpPerReaction ?? 2}" style="width:100%;box-sizing:border-box">
          </div>
        </div>
        <div id="xpEstimate" style="padding:12px;background:#1a2a1a;border-radius:4px;border-left:3px solid #4caf50;margin-bottom:12px;color:#4caf50;font-size:12px;display:none">
          <b>💡 Estimated XP/hour:</b> <span id="xpEstimateValue">0</span> XP
        </div>
        <button id="saveLevelingBtn" style="width:100%">💾 Save XP Settings</button>
      </div>

      <div style="padding:15px;background:#26262c;border-radius:6px;margin-bottom:15px">
        <h3 style="margin-top:0">📊 XP Per Level Settings</h3>
        <p style="font-size:12px;color:#b0b0b0;margin-bottom:10px">Choose how much XP is needed per level. In custom mode, values are used exactly (no base added).</p>

        <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-bottom:12px">
          <label style="display:flex;align-items:center;gap:8px;color:#b0b0b0">
            <input type="radio" name="xpMode" value="increment" ${levelingConfig?.xpMode !== 'custom' ? 'checked' : ''}>
            Use Increment Multiplier
          </label>
          <label style="display:flex;align-items:center;gap:8px;color:#b0b0b0">
            <input type="radio" name="xpMode" value="custom" ${levelingConfig?.xpMode === 'custom' ? 'checked' : ''}>
            Custom XP Per Level
          </label>
        </div>

        <div id="incrementMode" style="display:${levelingConfig?.xpMode !== 'custom' ? 'grid' : 'none'};grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:12px">
          <div>
            <label style="display:block;margin-bottom:5px;font-weight:bold">Base XP (Level 1)</label>
            <input id="baseXp" type="number" min="0" value="${levelingConfig?.baseXp ?? 100}" style="width:100%">
          </div>
          <div>
            <label style="display:block;margin-bottom:5px;font-weight:bold">Increment per Level</label>
            <input id="xpIncrement" type="number" min="0" step="5" value="${levelingConfig?.xpIncrement ?? 50}" style="width:100%">
          </div>
        </div>

        <div id="customMode" style="display:${levelingConfig?.xpMode === 'custom' ? 'block' : 'none'};overflow:hidden;border:1px solid #3a3a42;border-radius:6px;padding:12px;background:#0f0f12">
          <div id="customXpList" style="width:100%;max-width:980px;margin:0 auto;display:block"></div>
        </div>

        <button id="saveXpSettingsBtn" style="width:100%">💾 Save XP Settings</button>
      </div>


    </div>
  </div>
</div>

<div id="section-config" data-leveling-section style="display:none">
  <div class="card">
    <div style="max-width:900px;margin:0 auto">
      <h2>🔧 Leveling Configuration</h2>
      
      <div style="padding:15px;background:#26262c;border-radius:6px;margin-bottom:15px">
        <h3 style="margin-top:0">📊 Level Milestones</h3>
        <p style="font-size:12px;color:#b0b0b0;margin-bottom:10px">Announce when users reach these levels (comma-separated)</p>
        <input id="milestones" placeholder="10,25,50,100" style="width:100%;margin-bottom:10px" value="${levelingConfig?.levelMilestones?.join(',') ?? '10,25,50,100'}">
        <button id="saveMilestonesBtn" style="width:100%">Save Milestones</button>
      </div>

      <div style="padding:15px;background:#26262c;border-radius:6px">
        <h3 style="margin-top:0">📢 Level-Up Announcements Channel</h3>
        <p style="font-size:12px;color:#b0b0b0;margin-bottom:10px">Select where level-up notifications are posted</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <input id="levelUpChannel" placeholder="Channel ID" style="flex:1;min-width:200px" value="${dashboardSettings?.levelUpChannelId ?? ''}">
          <button class="small" id="saveLevelUpChannelBtn" style="width:auto">Save</button>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:10px;padding:10px;background:#1a1a1d;border-radius:4px">
          <input type="checkbox" id="levelUpPingPlayer" style="width:18px;height:18px;cursor:pointer" ${dashboardSettings?.levelUpPingPlayer !== false ? 'checked' : ''}>
          <label for="levelUpPingPlayer" style="cursor:pointer;color:#b0b0b0;margin:0">Ping the player on level-up (otherwise just show name)</label>
        </div>
        <div id="levelUpChannelDisplay" style="padding:8px;background:#1a1a1d;border-radius:4px;color:#b0b0b0;font-size:12px;margin-top:10px"></div>
        <div id="channelNameBox" style="padding:10px;background:#2a2f3a;border-radius:4px;color:#9146ff;font-weight:bold;margin-top:8px;font-size:13px">📌 No channel selected</div>
      </div>

      <div style="padding:15px;background:#26262c;border-radius:6px;margin-bottom:15px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
          <input type="checkbox" id="enableIgnoreLists" style="width:18px;height:18px;cursor:pointer" ${((levelingConfig?.ignoreChannels?.length || 0) + (levelingConfig?.ignoreRoles?.length || 0)) > 0 ? 'checked' : ''} onchange="document.getElementById('ignoreListsContent').style.display=this.checked?'block':'none'">
          <h3 style="margin:0;cursor:pointer" onclick="document.getElementById('enableIgnoreLists').click()">🎯 Ignored Channels & Roles</h3>
        </div>
        <p style="font-size:12px;color:#b0b0b0;margin:0 0 10px 28px">Users in these channels or with these roles won't earn XP</p>
        <div id="ignoreListsContent" style="display:${((levelingConfig?.ignoreChannels?.length || 0) + (levelingConfig?.ignoreRoles?.length || 0)) > 0 ? 'block' : 'none'}">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:12px">
            <div>
              <label style="display:block;margin-bottom:5px;font-weight:bold;font-size:12px">No XP Channels (comma-separated IDs)</label>
              <textarea id="ignoreChannels" placeholder="Channel IDs separated by commas" style="width:100%;min-height:80px">${(levelingConfig?.ignoreChannels || []).join(',')}</textarea>
            </div>
            <div>
              <label style="display:block;margin-bottom:5px;font-weight:bold;font-size:12px">No XP Roles (comma-separated IDs)</label>
              <textarea id="ignoreRoles" placeholder="Role IDs separated by commas" style="width:100%;min-height:80px">${(levelingConfig?.ignoreRoles || []).join(',')}</textarea>
            </div>
          </div>
          <button id="saveIgnoreListBtn" style="width:100%">💾 Save Ignored Channels & Roles</button>
        </div>
      </div>

      <div style="padding:15px;background:#26262c;border-radius:6px;margin-bottom:15px">
        <h3 style="margin-top:0">⭐ XP Boosts & Modifiers</h3>
        <p style="font-size:12px;color:#b0b0b0;margin-bottom:12px">Configure multipliers, time boosts, and XP decay</p>

        <!-- Global / Role / Channel Multipliers -->
        <div style="padding:12px;background:#1a1a1d;border-radius:6px;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <input type="checkbox" id="enableMultipliers" style="width:16px;height:16px;cursor:pointer" ${(levelingConfig?.globalMultiplier && levelingConfig.globalMultiplier > 1) || Object.keys(levelingConfig?.roleMultipliers || {}).length > 0 || Object.keys(levelingConfig?.channelMultipliers || {}).length > 0 ? 'checked' : ''} onchange="document.getElementById('multipliersContent').style.display=this.checked?'block':'none'">
            <label for="enableMultipliers" style="cursor:pointer;color:#e0e0e0;font-weight:bold;font-size:13px;margin:0">XP Multipliers</label>
          </div>
          <div id="multipliersContent" style="display:${(levelingConfig?.globalMultiplier && levelingConfig.globalMultiplier > 1) || Object.keys(levelingConfig?.roleMultipliers || {}).length > 0 || Object.keys(levelingConfig?.channelMultipliers || {}).length > 0 ? 'block' : 'none'}">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:12px">
              <div>
                <label style="display:block;margin-bottom:5px;font-size:12px;color:#b0b0b0">Global Server Multiplier</label>
                <input id="globalMultiplier" type="number" min="1" step="0.1" value="${levelingConfig?.globalMultiplier ?? 1}" style="width:100%">
              </div>
            </div>
            <div style="margin-bottom:8px">
              <label style="display:block;margin-bottom:5px;font-size:12px;color:#b0b0b0">Role Multipliers (roleID:multiplier, comma-separated)</label>
              <textarea id="roleMultipliers" placeholder="roleID1:2.0,roleID2:1.5" style="width:100%;min-height:60px">${(() => {
                const rm = levelingConfig?.roleMultipliers || {};
                return Object.entries(rm).map(([id, mult]) => id + ':' + mult).join(',');
              })()}</textarea>
            </div>
            <div>
              <label style="display:block;margin-bottom:5px;font-size:12px;color:#b0b0b0">Channel Multipliers (channelID:multiplier, comma-separated)</label>
              <textarea id="channelMultipliers" placeholder="channelID1:1.2,channelID2:1.5" style="width:100%;min-height:60px">${(() => {
                const cm = levelingConfig?.channelMultipliers || {};
                return Object.entries(cm).map(([id, mult]) => id + ':' + mult).join(',');
              })()}</textarea>
            </div>
          </div>
        </div>

        <!-- Weekend/Time Boost -->
        <div style="padding:12px;background:#1a1a1d;border-radius:6px;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <input type="checkbox" id="enableTimeBoost" style="width:16px;height:16px;cursor:pointer" ${levelingConfig?.enableTimeBoost ? 'checked' : ''} onchange="document.getElementById('timeBoostSettings').style.display=this.checked?'grid':'none'">
            <label for="enableTimeBoost" style="cursor:pointer;color:#e0e0e0;font-weight:bold;font-size:13px;margin:0">🌙 Weekend/Time Boost</label>
          </div>
          <div id="timeBoostSettings" style="display:${levelingConfig?.enableTimeBoost ? 'grid' : 'none'};grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px">
            <div>
              <label style="display:block;margin-bottom:4px;font-size:11px;color:#b0b0b0">Multiplier</label>
              <input id="timeBoostMultiplier" type="number" min="1" step="0.1" value="${levelingConfig?.timeBoostMultiplier ?? 2}" style="width:100%">
            </div>
            <div>
              <label style="display:block;margin-bottom:4px;font-size:11px;color:#b0b0b0">Start Day (0=Sun)</label>
              <input id="timeBoostStartDay" type="number" min="0" max="6" value="${levelingConfig?.timeBoostStartDay ?? 5}" style="width:100%">
            </div>
            <div>
              <label style="display:block;margin-bottom:4px;font-size:11px;color:#b0b0b0">End Day</label>
              <input id="timeBoostEndDay" type="number" min="0" max="6" value="${levelingConfig?.timeBoostEndDay ?? 0}" style="width:100%">
            </div>
            <div>
              <label style="display:block;margin-bottom:4px;font-size:11px;color:#b0b0b0">Start Hour</label>
              <input id="timeBoostStartHour" type="number" min="0" max="23" value="${levelingConfig?.timeBoostStartHour ?? 0}" style="width:100%">
            </div>
            <div>
              <label style="display:block;margin-bottom:4px;font-size:11px;color:#b0b0b0">End Hour</label>
              <input id="timeBoostEndHour" type="number" min="0" max="23" value="${levelingConfig?.timeBoostEndHour ?? 23}" style="width:100%">
            </div>
          </div>
        </div>

        <!-- XP Decay -->
        <div style="padding:12px;background:#1a1a1d;border-radius:6px;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <input type="checkbox" id="enableXpDecay" style="width:16px;height:16px;cursor:pointer" ${levelingConfig?.enableXpDecay ? 'checked' : ''} onchange="document.getElementById('xpDecaySettings').style.display=this.checked?'grid':'none'">
            <label for="enableXpDecay" style="cursor:pointer;color:#e0e0e0;font-weight:bold;font-size:13px;margin:0">📉 XP Decay</label>
          </div>
          <div id="xpDecaySettings" style="display:${levelingConfig?.enableXpDecay ? 'grid' : 'none'};grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">
            <div>
              <label style="display:block;margin-bottom:4px;font-size:11px;color:#b0b0b0">Inactivity days threshold</label>
              <input id="xpDecayDays" type="number" min="1" value="${levelingConfig?.xpDecayDays ?? 14}" style="width:100%">
            </div>
            <div>
              <label style="display:block;margin-bottom:4px;font-size:11px;color:#b0b0b0">XP loss per day (%)</label>
              <input id="xpDecayPercent" type="number" min="0" max="100" value="${levelingConfig?.xpDecayPercent ?? 5}" style="width:100%">
            </div>
          </div>
        </div>

        <button id="saveMultipliersBtn" style="width:100%">💾 Save All Boosts & Modifiers</button>
      </div>

      <div style="padding:15px;background:#26262c;border-radius:6px;margin-bottom:15px">
        <h3 style="margin-top:0">🎉 Level-Up Notifications</h3>
        <p style="font-size:12px;color:#b0b0b0;margin-bottom:12px">Customize message content and announcement behavior</p>

        <div style="margin-bottom:12px">
          <label style="display:block;margin-bottom:5px;font-weight:bold;font-size:12px;color:#b0b0b0">Custom Message Template</label>
          <p style="font-size:11px;color:#888;margin:0 0 6px 0">Variables: {user}, {mention}, {level}, {prestige}, {xp}, {next_level}</p>
          <textarea id="customLevelUpMessage" placeholder="Example: 🎉 {mention} just reached Level {level}! ({prestige}★)" style="width:100%;min-height:80px">${levelingConfig?.customLevelUpMessage ?? '🎉 {mention} just reached Level {level}!'}</textarea>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:#1a1a1d;border-radius:4px">
            <input type="checkbox" id="milestonesOnly" style="width:16px;height:16px;cursor:pointer" ${levelingConfig?.milestonesOnly ? 'checked' : ''}>
            <label for="milestonesOnly" style="cursor:pointer;color:#b0b0b0;font-size:13px;margin:0">Only announce milestones (reduces spam)</label>
          </div>
          <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:#1a1a1d;border-radius:4px">
            <input type="checkbox" id="dmOnLevelUp" style="width:16px;height:16px;cursor:pointer" ${levelingConfig?.dmOnLevelUp ? 'checked' : ''}>
            <label for="dmOnLevelUp" style="cursor:pointer;color:#b0b0b0;font-size:13px;margin:0">Also DM users when they level up</label>
          </div>
        </div>

        <button id="saveLevelUpMessageBtn" style="width:100%">💾 Save Notification Settings</button>
      </div>

      <div style="padding:15px;background:#26262c;border-radius:6px">
        <h3 style="margin-top:0">🎨 Embed Color & Image</h3>
        <p style="font-size:12px;color:#b0b0b0;margin-bottom:10px">Customize the appearance of level-up announcements</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">
          <div>
            <label style="display:block;margin-bottom:5px;font-size:12px">Embed Color (hex, e.g., #9146ff)</label>
            <input id="levelUpColor" type="text" placeholder="#9146ff" value="${levelingConfig?.levelUpColor ?? '#9146ff'}" style="width:100%">
          </div>
          <div>
            <label style="display:block;margin-bottom:5px;font-size:12px">Thumbnail Image URL</label>
            <input id="levelUpThumbnail" type="text" placeholder="https://..." value="${levelingConfig?.levelUpThumbnail ?? ''}" style="width:100%">
          </div>
          <div>
            <label style="display:block;margin-bottom:5px;font-size:12px">Footer Text</label>
            <input id="levelUpFooter" type="text" placeholder="Congratulations!" value="${levelingConfig?.levelUpFooter ?? 'Keep grinding!'}" style="width:100%">
          </div>
        </div>
        <button id="saveEmbedStyleBtn" style="width:100%;margin-top:12px">💾 Save Embed Style</button>
      </div>
    </div>
  </div>
</div>

<div id="section-rewards" data-leveling-section style="display:none">
  <div class="card">
    <div style="max-width:900px;margin:0 auto">
      <h2>🎁 Role Rewards</h2>
      <p style="color:#b0b0b0;margin-bottom:15px">Grant roles to users when they reach certain levels</p>
      <div style="padding:15px;background:#26262c;border-radius:6px;margin-bottom:15px">
        <h3 style="margin-top:0">Add Reward</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <input id="rewardLevel" type="number" min="1" placeholder="Level" style="flex:1;min-width:100px">
          <div style="flex:1;min-width:150px">
            <select id="rewardRoleId" style="width:100%;background:#1e1f22;color:#e0e0e0;border:1px solid #444;border-radius:6px;padding:6px 8px;font-size:13px"><option value="">Select a role...</option></select>
            <div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap" id="rewardRoleFilter">
              <button type="button" class="small" style="padding:2px 8px;font-size:10px;width:auto;background:#2a2f3a" onclick="filterRewardRoles('')">All</button>
              <button type="button" class="small" style="padding:2px 8px;font-size:10px;width:auto;background:#2a2f3a" onclick="filterRewardRoles('LV')">LV</button>
            </div>
          </div>
          <button class="small" id="addRoleRewardBtn" style="width:auto">Add Reward</button>
        </div>
      </div>

      <details style="background:#26262c;border-radius:6px;padding:15px">
        <summary style="cursor:pointer;font-weight:700;font-size:14px;color:#e0e0e0;user-select:none">Current Rewards <span id="roleRewardsCount" style="font-size:11px;color:#8b8fa3;font-weight:400"></span></summary>
        <div id="roleRewardsList" style="margin-top:12px"></div>
      </details>

      <div style="padding:15px;background:#26262c;border:1px solid #3a3a42;border-radius:6px;margin-top:15px">
        <h3 style="margin-top:0;color:#e0e0e0">🔄 Role Sync</h3>
        <p style="color:#b0b0b0;font-size:12px;margin-bottom:10px">Check all users and assign/remove roles based on their current level. This will also apply auto-join roles for new members.</p>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;font-size:13px;color:#e0e0e0;background:#26262c;padding:6px 12px;border-radius:6px;border:1px solid #3a3a42">
            <input type="checkbox" id="syncKeepRoles" checked style="accent-color:#f39c12">
            <span>🛡️ Keep previous level roles</span>
          </label>
          <span style="font-size:11px;color:#8b8fa3">(when checked, users keep roles from lower levels even if they leveled past them)</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button class="small" id="syncRolesBtn" style="width:auto;background:#2ecc71;color:#fff;font-weight:700;padding:8px 20px" onclick="window.syncLevelRoles()">🔄 Sync All Roles Now</button>
          <button class="small" id="previewSyncBtn" style="width:auto;background:#3498db;color:#fff;padding:8px 20px" onclick="window.previewRoleSync()">👁️ Preview Changes</button>
        </div>
        <div id="roleSyncStatus" style="margin-top:10px;display:none"></div>
        <div id="roleSyncResults" style="margin-top:10px;display:none;max-height:300px;overflow-y:auto"></div>
      </div>
    </div>
  </div>
</div>

<div id="editLevelModal" style="display:none;position:fixed;top:20%;left:50%;transform:translate(-50%,0);background:#23232b;padding:24px;border-radius:8px;z-index:1000;border:2px solid #9146ff;max-width:450px;box-shadow:0 8px 32px rgba(0,0,0,0.5)">
  <h3 style="margin-top:0;color:#fff">Edit User Level/XP</h3>
  <input type="hidden" id="editUserId">
  <div style="margin:15px 0;padding:10px;background:#1a1a1d;border-radius:4px;color:#9146ff;font-weight:bold"><span id="editUserDisplay"></span></div>
  
  <div style="margin:15px 0">
    <label style="display:block;margin-bottom:5px;font-weight:bold">Level:</label>
    <input id="editLevel" type="number" min="0" style="width:100%;padding:10px;background:#2a2f3a;border:1px solid #3a3a42;border-radius:4px;color:#e0e0e0">
  </div>
  <div style="margin:15px 0">
    <label style="display:block;margin-bottom:5px;font-weight:bold">XP:</label>
    <input id="editXP" type="number" min="0" style="width:100%;padding:10px;background:#2a2f3a;border:1px solid #3a3a42;border-radius:4px;color:#e0e0e0">
  </div>
  <div style="margin:15px 0">
    <label style="display:block;margin-bottom:5px;font-weight:bold">XP Multiplier:</label>
    <input id="editMultiplier" type="number" min="1" step="0.1" value="1" style="width:100%;padding:10px;background:#2a2f3a;border:1px solid #3a3a42;border-radius:4px;color:#e0e0e0">
    <small style="color:#999">Default: 1 (set higher for bonus XP)</small>
  </div>
  
  <div style="display:flex;gap:8px;margin-top:20px">
    <button id="saveLevelEditBtn" style="flex:1;padding:10px;background:#4caf50;color:white;border:none;border-radius:4px;font-weight:bold;cursor:pointer">Save Changes</button>
    <button id="closeLevelModalBtn" style="flex:1;padding:10px;background:#c43c3c;color:white;border:none;border-radius:4px;font-weight:bold;cursor:pointer">Cancel</button>
  </div>
</div>
<div id="quickActionModal" style="display:none;position:fixed;top:20%;left:50%;transform:translate(-50%,0);background:#23232b;padding:24px;border-radius:8px;z-index:1000;border:2px solid #4caf50;max-width:420px;box-shadow:0 8px 32px rgba(0,0,0,0.5)">
  <h3 style="margin-top:0;color:#fff" id="quickActionTitle">Quick Action</h3>
  <input type="hidden" id="quickActionUserId">
  <input type="hidden" id="quickActionType">
  <div style="margin:10px 0;padding:10px;background:#1a1a1d;border-radius:4px;color:#b0b0b0;font-size:12px">
    <span id="quickActionUserDisplay"></span>
  </div>
  <div id="quickActionXpRow" style="margin:15px 0;display:none">
    <label style="display:block;margin-bottom:5px;font-weight:bold">Add XP:</label>
    <input id="quickActionXp" type="number" min="1" style="width:100%;padding:10px;background:#2a2f3a;border:1px solid #3a3a42;border-radius:4px;color:#e0e0e0">
  </div>
  <div id="quickActionPrestigeRow" style="margin:15px 0;display:none">
    <label style="display:block;margin-bottom:5px;font-weight:bold">Prestige Level:</label>
    <input id="quickActionPrestige" type="number" min="1" style="width:100%;padding:10px;background:#2a2f3a;border:1px solid #3a3a42;border-radius:4px;color:#e0e0e0">
  </div>
  <div id="quickActionConfirmText" style="margin:12px 0;color:#b0b0b0;font-size:12px"></div>
  <div style="display:flex;gap:8px;margin-top:20px">
    <button id="quickActionConfirmBtn" style="flex:1;padding:10px;background:#4caf50;color:white;border:none;border-radius:4px;font-weight:bold;cursor:pointer">Confirm</button>
    <button id="quickActionCancelBtn" style="flex:1;padding:10px;background:#3a3a42;color:white;border:none;border-radius:4px;font-weight:bold;cursor:pointer">Cancel</button>
  </div>
</div>
<div id="modalBackdrop" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);z-index:999"></div>

<script>
console.log('=== LEVELING TAB SCRIPT LOADING ===');

// User autocomplete for prestige/reset inputs
function autocompleteUserInput(input, suggestionsId) {
  var q = input.value.trim().toLowerCase();
  var box = document.getElementById(suggestionsId);
  if (!box || q.length < 2) { if (box) box.style.display = 'none'; return; }
  var names = window.usernamesData || {};
  var matches = Object.entries(names).filter(function(e) { return e[1].toLowerCase().indexOf(q) !== -1 || e[0].indexOf(q) !== -1; }).slice(0, 8);
  if (matches.length === 0) { box.style.display = 'none'; return; }
  box.innerHTML = matches.map(function(e) {
    return '<div style="padding:6px 10px;cursor:pointer;font-size:12px;border-bottom:1px solid #2a2f3a;color:#e0e0e0" onmouseover="this.style.background=\'#2a2f3a\'" onmouseout="this.style.background=\'\'" onclick="selectUserSuggestion(this,\'' + e[0] + '\',\'' + suggestionsId + '\')">' + e[1] + ' <span style="color:#666;font-size:10px">' + e[0] + '</span></div>';
  }).join('');
  box.style.display = 'block';
}
function selectUserSuggestion(el, userId, suggestionsId) {
  var input = document.getElementById(suggestionsId).previousElementSibling || document.getElementById(suggestionsId).parentElement.querySelector('input');
  if (input) input.value = userId;
  document.getElementById(suggestionsId).style.display = 'none';
}
document.addEventListener('click', function(e) {
  document.querySelectorAll('#prestigeUserSuggestions,#resetUserSuggestions').forEach(function(b) {
    if (!b.contains(e.target)) b.style.display = 'none';
  });
});

// Populate role selectors for prestige and rewards
var _levelingRolesCache = null;
function populateLevelingRoles() {
  function fill() {
    var sel1 = document.getElementById('newPrestigeRoleId');
    var sel2 = document.getElementById('rewardRoleId');
    [sel1, sel2].forEach(function(sel) {
      if (!sel || sel.options.length > 1) return;
      var label = sel === sel1 ? 'Role (optional)' : 'Select a role...';
      sel.innerHTML = '<option value="">' + label + '</option>';
      _levelingRolesCache.forEach(function(r) {
        var opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = '@' + r.name;
        opt.setAttribute('data-name', r.name);
        sel.appendChild(opt);
      });
    });
  }
  if (_levelingRolesCache) { fill(); return; }
  fetch('/api/guild-roles').then(function(r) { return r.json(); }).then(function(data) {
    _levelingRolesCache = (data.roles || []).filter(function(r) { return r.name !== '@everyone' && !r.managed; }).sort(function(a,b) { return b.position - a.position; });
    fill();
  }).catch(function() {});
}
function filterPrestigeRoles(prefix) {
  var sel = document.getElementById('newPrestigeRoleId');
  if (!sel || !_levelingRolesCache) return;
  var curVal = sel.value;
  sel.innerHTML = '<option value="">Role (optional)</option>';
  _levelingRolesCache.filter(function(r) { return !prefix || r.name.toUpperCase().indexOf(prefix) !== -1; }).forEach(function(r) {
    var opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = '@' + r.name;
    if (r.id === curVal) opt.selected = true;
    sel.appendChild(opt);
  });
}
function filterRewardRoles(prefix) {
  var sel = document.getElementById('rewardRoleId');
  if (!sel || !_levelingRolesCache) return;
  var curVal = sel.value;
  sel.innerHTML = '<option value="">Select a role...</option>';
  _levelingRolesCache.filter(function(r) { return !prefix || r.name.toUpperCase().indexOf(prefix) !== -1; }).forEach(function(r) {
    var opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = '@' + r.name;
    if (r.id === curVal) opt.selected = true;
    sel.appendChild(opt);
  });
}
populateLevelingRoles();

window.switchLevelingTab = function(tab) {
  console.log('Switching to tab:', tab);
  document.querySelectorAll('[data-leveling-section]').forEach(el => el.style.display = 'none');
  document.getElementById('section-' + tab).style.display = 'block';
  document.querySelectorAll('[id^="tab-"]').forEach(btn => btn.style.background = '#2a2f3a');
  document.getElementById('tab-' + tab).style.background = '#9146ff';
}
console.log('switchLevelingTab defined:', typeof window.switchLevelingTab);
window.toggleXpMode = function(mode) {
  const incrementMode = document.getElementById('incrementMode');
  const customMode = document.getElementById('customMode');
  if (mode === 'increment') {
    incrementMode.style.display = 'flex';
    customMode.style.display = 'none';
  } else {
    incrementMode.style.display = 'none';
    customMode.style.display = 'flex';
    if (typeof window.renderCustomXpList === 'function') {
      window.renderCustomXpList();
    }
  }
}
window.renderCustomXpList = function() {
  const list = document.getElementById('customXpList');
  const customXp = (window.levelingConfig && window.levelingConfig.customXpPerLevel) || {};
  const maxLevel = Math.max(...Object.keys(customXp).map(Number), 100);
  let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;width:100%">';
  for (let i = 1; i <= maxLevel + 1; i++) {
    html += '<div style="background:#26262c;padding:10px;border-radius:6px;border:1px solid #3a3a42">' +
      '<label style="display:block;font-size:11px;margin-bottom:6px;color:#9146ff;font-weight:600">Level ' + i + '</label>' +
      '<input type="number" min="0" value="' + (customXp[i] || 0) + '" style="width:100%;padding:6px;background:#1a1a1d;border:1px solid #4a4a4e;border-radius:4px;color:#fff;font-size:13px;text-align:center;box-sizing:border-box" data-level="' + i + '">' +
    '</div>';
  }
  html += '</div>' +
    '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:12px 0;border-top:1px solid #3a3a42;margin-top:15px">' +
      '<button class="small" style="padding:8px 12px;white-space:nowrap" data-action="add-more-levels">+5 Levels</button>' +
      '<span style="font-size:12px;color:#b0b0b0">Fill every level you use (0 disables that level)</span>' +
    '</div>';
  list.innerHTML = html;
}
window.addMoreLevels = function() {
  const inputs = document.querySelectorAll('#customXpList input');
  const maxLevel = Math.max(...Array.from(inputs).map(i => parseInt(i.dataset.level)), 100);
  const customXp = (window.levelingConfig && window.levelingConfig.customXpPerLevel) || {};
  let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;width:100%">';
  for (let i = 1; i <= maxLevel + 5; i++) {
    html += '<div style="background:#26262c;padding:10px;border-radius:6px;border:1px solid #3a3a42">' +
      '<label style="display:block;font-size:11px;margin-bottom:6px;color:#9146ff;font-weight:600">Level ' + i + '</label>' +
      '<input type="number" min="0" value="' + (customXp[i] || 0) + '" style="width:100%;padding:6px;background:#1a1a1d;border:1px solid #4a4a4e;border-radius:4px;color:#fff;font-size:13px;text-align:center;box-sizing:border-box" data-level="' + i + '">' +
    '</div>';
  }
  html += '</div>' +
    '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:12px 0;border-top:1px solid #3a3a42;margin-top:15px">' +
      '<button class="small" style="padding:8px 12px;white-space:nowrap" data-action="add-more-levels">+5 Levels</button>' +
      '<span style="font-size:12px;color:#b0b0b0">Fill every level you use (0 disables that level)</span>' +
    '</div>';
  document.getElementById('customXpList').innerHTML = html;
}
window.renderPrestigeThresholds = function() {
  const prestigeConfig = (window.levelingConfig && window.levelingConfig.prestigeThresholds) || {};
  const list = document.getElementById('prestigeThresholdsList');
  const entries = Object.entries(prestigeConfig).sort((a, b) => Number(a[0]) - Number(b[0]));
  if (entries.length === 0) {
    list.innerHTML = '<p style="color:#999;font-size:12px">No prestige thresholds configured yet</p>';
    return;
  }
  list.innerHTML = entries.map(([rank, config]) => 
    '<div style="padding:8px;background:#1a1a1d;border-radius:4px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">' +
      '<div><strong>Prestige ' + rank + ':</strong> Reach Level ' + config.levelRequired + (config.roleId ? ' -> Role: ' + config.roleId : '') + '</div>' +
      '<button class="small" style="padding:4px 8px;font-size:11px" data-prestige-remove="' + rank + '">Remove</button>' +
    '</div>'
  ).join('');
}

window.resolvePrestigeRole = function() {
  const input = document.getElementById('newPrestigeRoleId');
  const display = document.getElementById('prestigeRoleName');
  const roleId = input && input.value ? input.value.trim() : '';
  
  if (!roleId) {
    display.textContent = '';
    return;
  }
  
  display.textContent = 'Loading...';
  fetch('/role/info/' + roleId)
    .then(r => r.json())
    .then(data => {
      if (data && data.name) {
        display.textContent = '\u2713 @' + data.name;
        display.style.color = data.hexColor || '#57F287';
      } else {
        display.textContent = '\u2717 Role not found';
        display.style.color = '#ED4245';
      }
    })
    .catch(() => {
      display.textContent = '\u2717 Error fetching role';
      display.style.color = '#ED4245';
    });
}

window.addPrestigeThreshold = function() {
  const rank = parseInt(document.getElementById('newPrestigeRank').value);
  const lvl = parseInt(document.getElementById('newPrestigeLvl').value);
  const roleId = document.getElementById('newPrestigeRoleId').value.trim();
  if (!rank || !lvl || rank < 1 || lvl < 1) return alert('Enter valid prestige rank and level');
  if (!window.levelingConfig) window.levelingConfig = {};
  if (!window.levelingConfig.prestigeThresholds) window.levelingConfig.prestigeThresholds = {};
  window.levelingConfig.prestigeThresholds[rank] = { levelRequired: lvl, roleId: roleId || null };
  window.renderPrestigeThresholds();
  document.getElementById('newPrestigeRank').value = '';
  document.getElementById('newPrestigeLvl').value = '';
  document.getElementById('newPrestigeRoleId').value = '';
  document.getElementById('prestigeRoleName').textContent = '';
  // Save to server
  window.saveLevelingConfig(false);
}
window.deletePrestigeThreshold = function(rank) {
  if (window.levelingConfig && window.levelingConfig.prestigeThresholds) {
    delete window.levelingConfig.prestigeThresholds[rank];
    window.renderPrestigeThresholds();
    // Save to server
    window.saveLevelingConfig(false);
  }
}

window.renderPrestigeBenefits = function() {
  const benefits = window.levelingConfig?.prestigeBenefits || {};
  const list = document.getElementById('prestigeBenefitsList');
  if (!list) return;
  
  const entries = Object.entries(benefits).sort((a, b) => Number(a[0]) - Number(b[0]));
  if (entries.length === 0) {
    list.innerHTML = '<p style="color:#999">No benefits configured yet</p>';
    return;
  }
  
  list.innerHTML = entries.map(([rank, benefit]) => {
    return '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px;background:#1a2a1a;border-radius:4px;margin-bottom:8px;border-left:3px solid #4caf50">' +
      '<div style="background:#4caf50;color:white;padding:6px 12px;border-radius:4px;font-weight:bold;min-width:70px;text-align:center">Prestige #' + rank + '</div>' +
      '<div style="flex:1 1 260px">' +
        '<div style="color:#e0e0e0;font-weight:bold">' + (benefit.description || 'No description') + '</div>' +
        '<div style="color:#999;font-size:11px">+' + (benefit.xpMultiplier * 100).toFixed(1) + '% XP Multiplier</div>' +
      '</div>' +
      '<button class="small danger" style="padding:6px 10px;font-size:11px;white-space:nowrap;margin-left:auto" data-benefit-remove="' + rank + '">Remove</button>' +
    '</div>';
  }).join('');
}

window.addPrestigeBenefit = function() {
  const rank = parseInt(document.getElementById('benefitPrestigeRank').value);
  const multiplier = parseFloat(document.getElementById('benefitXpMultiplier').value) || 0;
  const description = document.getElementById('benefitDescription').value.trim();
  
  if (!rank || rank < 1) return alert('Enter valid prestige rank');
  if (!description) return alert('Enter perk description');
  
  if (!window.levelingConfig) window.levelingConfig = {};
  if (!window.levelingConfig.prestigeBenefits) window.levelingConfig.prestigeBenefits = {};
  
  window.levelingConfig.prestigeBenefits[rank] = {
    xpMultiplier: 1 + (multiplier / 100),
    description: description
  };
  
  window.renderPrestigeBenefits();
  document.getElementById('benefitPrestigeRank').value = '';
  document.getElementById('benefitXpMultiplier').value = '';
  document.getElementById('benefitDescription').value = '';
  window.saveLevelingConfig(false);
}

window.deletePrestigeBenefit = function(rank) {
  if (window.levelingConfig && window.levelingConfig.prestigeBenefits) {
    delete window.levelingConfig.prestigeBenefits[rank];
    window.renderPrestigeBenefits();
    window.saveLevelingConfig(false);
  }
}

window.savePrestigeRequirements = function() {
  const minLevel = parseInt(document.getElementById('prestigeMinLevel').value) || 0;
  const xpCost = parseInt(document.getElementById('prestigeXpCost').value) || 0;
  
  if (!window.levelingConfig) window.levelingConfig = {};
  window.levelingConfig.prestigeMinLevel = minLevel;
  window.levelingConfig.prestigeXpCost = xpCost;
  
  window.saveLevelingConfig();
  alert('✅ Prestige requirements saved!');
}

window.saveXpSettings = function() {
  const mode = document.querySelector('input[name="xpMode"]:checked').value;
  if (mode === 'increment') {
    window.levelingConfig.xpMode = 'increment';
    window.levelingConfig.baseXp = parseInt(document.getElementById('baseXp').value) || 100;
    window.levelingConfig.xpIncrement = parseInt(document.getElementById('xpIncrement').value) || 50;
    delete window.levelingConfig.customXpPerLevel;
  } else {
    const inputs = document.querySelectorAll('#customXpList input');
    const customXp = {};
    inputs.forEach(input => {
      const level = parseInt(input.dataset.level);
      const xp = parseInt(input.value) || 0;
      if (xp > 0) customXp[level] = xp;
    });
    if (Object.keys(customXp).length === 0) return alert('Enter XP values for at least one level');
    window.levelingConfig.xpMode = 'custom';
    window.levelingConfig.customXpPerLevel = customXp;
  }
  window.saveLevelingConfig();
}
window.searchLevelUser = function() {
  const input = document.getElementById('levelUser').value.trim().toLowerCase();
  if (!input) {
    document.getElementById('levelUserResult').innerHTML = '';
    return;
  }
  
  const results = [];
  for (const [id, data] of Object.entries(window.levelingData)) {
    const userName = window.nameCache && window.nameCache[id] ? window.nameCache[id].toLowerCase() : '';
    if (id.includes(input) || userName.includes(input)) {
      results.push({id, userName: userName || id, data});
    }
  }
  
  if (results.length === 0) {
    document.getElementById('levelUserResult').innerHTML = '<p style="color:#ef5350">❌ No users found</p>';
    return;
  }
  
  document.getElementById('levelUserResult').innerHTML = results.map(r => 
    '<div style="padding:10px;background:#26262c;border-radius:4px;margin-bottom:8px">' +
      '<div style="color:#9146ff;font-weight:bold">' + r.userName + ' (ID: ' + r.id + ')</div>' +
      '<div style="color:#b0b0b0;font-size:12px">Level ' + r.data.level + ' • ' + r.data.xp + ' XP</div>' +
      '<button class="small" style="margin-top:5px;padding:4px 8px;font-size:11px" data-edit-id="' + r.id + '">Edit</button>' +
    '</div>'
  ).join('');
}

window.grantPrestige = function() {
  console.log('Granting prestige');
  const userId = document.getElementById('prestigeUserId').value.trim();
  const prestigeLevel = parseInt(document.getElementById('prestigeLevel').value);
  if (!userId || !prestigeLevel) return alert('Enter user ID and prestige level');
  
  fetch('/leveling/prestige', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({userId, prestigeLevel})
  }).then(r=>r.json()).then(data=>{
    if(data.success) {
      alert('✅ Prestige granted!');
      document.getElementById('prestigeUserId').value = '';
      document.getElementById('prestigeLevel').value = '';
      location.reload();
    } else alert('Failed: ' + (data.error || 'Unknown'));
  }).catch(err => alert('Error: ' + err.message));
}

window.editLevel = function(id) {
  console.log('Editing level for:', id);
  const d = window.levelingData[id];
  const userName = Object.keys(window.nameCache || {}).find(k => window.nameCache[k] === id) || id;
  document.getElementById('editUserId').value = id;
  document.getElementById('editUserDisplay').textContent = userName;
  document.getElementById('editLevel').value = d.level;
  document.getElementById('editXP').value = d.xp;
  document.getElementById('editMultiplier').value = d.xpMultiplier || 1;
  document.getElementById('editLevelModal').style.display = 'block';
  document.getElementById('modalBackdrop').style.display = 'block';
}
window.closeLevelModal = function() {
  document.getElementById('editLevelModal').style.display = 'none';
  document.getElementById('modalBackdrop').style.display = 'none';
}
window.saveLevelEdit = function() {
  const id = document.getElementById('editUserId').value;
  const level = parseInt(document.getElementById('editLevel').value);
  const xp = parseInt(document.getElementById('editXP').value);
  const xpMultiplier = parseFloat(document.getElementById('editMultiplier').value) || 1;
  fetch('/leveling/edit', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({id, level, xp, xpMultiplier})
  }).then(r=>r.json()).then(data=>{
    if(data.success) {
      alert('✅ User updated!');
      window.closeLevelModal();
      location.reload();
    }
    else alert('Failed to update');
  });
}

window.resetUserLevel = function() {
  const userId = document.getElementById('resetUserId').value.trim();
  if (!userId) return alert('Enter user ID');
  
  fetch('/leveling/reset-level', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({userId})
  }).then(r=>r.json()).then(data=>{
    if(data.success) {
      alert('✅ User level reset!');
      document.getElementById('resetUserId').value = '';
      location.reload();
    } else alert('Failed: ' + (data.error || 'Unknown'));
  }).catch(err => alert('Error: ' + err.message));
}

window.renderRoleRewards = function(){
  const entries = Object.entries(window.levelingConfig.roleRewards || {}).sort((a,b)=>Number(a[0])-Number(b[0]));
  const el = document.getElementById('roleRewardsList');
  const countBadge = document.getElementById('roleRewardsCount');
  if (countBadge) countBadge.textContent = '(' + entries.length + ')';
  if(!el) return;
  if(entries.length === 0){
    el.innerHTML = '<p style="color:#999">No role rewards configured yet</p>';
    return;
  }
  el.innerHTML = entries.map(([lvl, role]) => {
    return '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px;background:#1a1a1d;border-radius:4px;margin-bottom:8px">' +
      '<div style="background:#9146ff;color:white;padding:6px 10px;border-radius:4px;font-weight:bold;min-width:60px;text-align:center">Lvl ' + lvl + '</div>' +
      '<div style="flex:1 1 260px;color:#b0b0b0">Role: <span data-role-info="' + role + '" style="color:#e0e0e0">Loading...</span><span style="color:#666;margin-left:8px;font-size:11px">(' + role + ')</span></div>' +
      '<button class="small danger" style="padding:6px 10px;font-size:11px;white-space:nowrap;margin-left:auto" data-role-reward-remove="' + lvl + '">Remove</button>' +
    '</div>';
  }).join('');

  el.querySelectorAll('[data-role-info]').forEach(infoEl => {
    const roleId = infoEl.getAttribute('data-role-info');
    fetch('/role/info/' + roleId)
      .then(r => r.json())
      .then(data => {
        if (data && data.name) {
          infoEl.textContent = data.name;
          if (data.hexColor) infoEl.style.color = data.hexColor;
        } else {
          infoEl.textContent = 'Unknown role';
        }
      })
      .catch(() => {
        infoEl.textContent = 'Unknown role';
      });
  });
}

function gatherLevelingConfig(){
  const xpMin = parseInt(document.getElementById('xpMin').value) || 0;
  const xpMax = parseInt(document.getElementById('xpMax').value) || 0;
  const cooldown = parseInt(document.getElementById('cooldown').value) || 0;
  const voiceXp = parseInt(document.getElementById('voiceXp').value) || 5;
  const reactionXp = parseInt(document.getElementById('reactionXp').value) || 2;
  return {
    xpPerMessageMin: Math.max(0, xpMin),
    xpPerMessageMax: Math.max(xpMin, xpMax),
    messageCooldownMs: Math.max(0, cooldown * 1000),
    xpPerVoiceMinute: Math.max(0, voiceXp),
    xpPerReaction: Math.max(0, reactionXp),
    xpMultiplier: window.levelingConfig.xpMultiplier || 1,
    multiplierEndTime: window.levelingConfig.multiplierEndTime || null,
    levelMilestones: window.levelingConfig.levelMilestones || [10, 25, 50, 100],
    roleRewards: { ...(window.levelingConfig.roleRewards || {}) },
    xpMode: window.levelingConfig.xpMode || 'increment',
    baseXp: window.levelingConfig.baseXp ?? 100,
    xpIncrement: window.levelingConfig.xpIncrement ?? 50,
    customXpPerLevel: { ...(window.levelingConfig.customXpPerLevel || {}) },
    prestigeThresholds: { ...(window.levelingConfig.prestigeThresholds || {}) }
  };
}

window.saveLevelingConfig = function(showAlert=true){
  const cfg = gatherLevelingConfig();
  return fetch('/leveling/config', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(cfg)
  }).then(r=>{
    if(!r.ok) throw new Error('Failed');
    return r.json();
  }).then(()=>{
    window.levelingConfig = cfg;
    window.renderRoleRewards();
    if(showAlert) alert('✅ Leveling settings saved');
  }).catch(err=>{
    console.error(err);
    alert('Failed to save settings');
  });
}

window.resolveRewardRole = function() {
  const input = document.getElementById('rewardRoleId');
  const display = document.getElementById('rewardRoleName');
  const roleId = input && input.value ? input.value.trim() : '';
  
  if (!roleId) {
    display.textContent = '';
    return;
  }
  
  display.textContent = 'Loading...';
  fetch('/role/info/' + roleId)
    .then(r => r.json())
    .then(data => {
      if (data && data.name) {
        display.textContent = '\u2713 @' + data.name;
        display.style.color = data.hexColor || '#57F287';
      } else {
        display.textContent = '\u2717 Role not found';
        display.style.color = '#ED4245';
      }
    })
    .catch(() => {
      display.textContent = '\u2717 Error fetching role';
      display.style.color = '#ED4245';
    });
}

window.addRoleReward = function(){
  const level = parseInt(document.getElementById('rewardLevel').value);
  const roleId = document.getElementById('rewardRoleId').value.trim();
  if(!level || !roleId) return alert('Enter a level and select a role');
  
  if(!window.levelingConfig.roleRewards) window.levelingConfig.roleRewards = {};
  window.levelingConfig.roleRewards[level] = roleId;
  window.renderRoleRewards();
  
  const fullConfig = {
    xpPerMessageMin: parseInt(document.getElementById('xpMin').value) || 0,
    xpPerMessageMax: parseInt(document.getElementById('xpMax').value) || 0,
    messageCooldownMs: (parseInt(document.getElementById('cooldown').value) || 0) * 1000,
    roleRewards: window.levelingConfig.roleRewards
  };
  
  fetch('/leveling/config', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(fullConfig)
  }).then(r => {
    if(!r.ok) throw new Error('Server error: ' + r.status);
    return r.json();
  }).then(data => {
    window.levelingConfig = data.levelingConfig || fullConfig;
    window.renderRoleRewards();
    alert('✅ Role reward saved!');
    document.getElementById('rewardLevel').value = '';
    document.getElementById('rewardRoleId').value = '';
  }).catch(err => {
    console.error('Error:', err);
    alert('Failed to save role reward: ' + err.message);
    if(window.levelingConfig.roleRewards) {
      delete window.levelingConfig.roleRewards[level];
    }
    window.renderRoleRewards();
  });
}

window.removeRoleReward = function(level){
  if(!window.levelingConfig.roleRewards) return;
  delete window.levelingConfig.roleRewards[level];
  window.saveLevelingConfig();
}

window.syncLevelRoles = function() {
  const btn = document.getElementById('syncRolesBtn');
  const status = document.getElementById('roleSyncStatus');
  const results = document.getElementById('roleSyncResults');
  const keepRoles = document.getElementById('syncKeepRoles')?.checked ?? true;
  if(btn) { btn.disabled = true; btn.textContent = '⏳ Syncing...'; }
  status.style.display = 'block';
  status.innerHTML = '<div style="color:#f39c12">⏳ Syncing roles for all users... This may take a moment.</div>';
  results.style.display = 'none';
  fetch('/leveling/sync-roles', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ keepRoles: keepRoles }) })
    .then(r => r.json())
    .then(data => {
      if(btn) { btn.disabled = false; btn.textContent = '🔄 Sync All Roles Now'; }
      if(data.success) {
        var skipMsg = data.skipped > 0 ? ', ' + data.skipped + ' roles kept (not removed)' : '';
        status.innerHTML = '<div style="color:#2ecc71;font-weight:600">✅ Sync complete! ' + data.added + ' roles added, ' + data.removed + ' roles removed' + skipMsg + ', ' + data.checked + ' users checked.</div>';
        if(data.details && data.details.length > 0) {
          results.style.display = 'block';
          results.innerHTML = '<h4 style="margin:0 0 8px;color:#e0e0e0">Changes Made:</h4>' + data.details.map(d => {
            var icon = d.action === 'added' ? '✅' : '❌';
            var color = d.action === 'added' ? '#2ecc71' : '#e74c3c';
            return '<div style="padding:4px 8px;font-size:12px;border-left:3px solid '+color+';margin-bottom:4px;background:#1e1f22;border-radius:0 4px 4px 0">' + icon + ' <b>' + (d.userName||d.userId) + '</b> — ' + d.action + ' role <b>' + (d.roleName||d.roleId) + '</b> (Lv.' + d.level + ')</div>';
          }).join('');
        } else {
          results.style.display = 'block';
          results.innerHTML = '<div style="color:#8b8fa3;font-size:12px">All users already have the correct roles. No changes needed.</div>';
        }
      } else {
        status.innerHTML = '<div style="color:#e74c3c">❌ Error: ' + (data.error||'Unknown error') + '</div>';
      }
    })
    .catch(err => {
      if(btn) { btn.disabled = false; btn.textContent = '🔄 Sync All Roles Now'; }
      status.innerHTML = '<div style="color:#e74c3c">❌ Network error: ' + err.message + '</div>';
    });
}

window.previewRoleSync = function() {
  const btn = document.getElementById('previewSyncBtn');
  const status = document.getElementById('roleSyncStatus');
  const results = document.getElementById('roleSyncResults');
  if(btn) { btn.disabled = true; btn.textContent = '⏳ Checking...'; }
  status.style.display = 'block';
  status.innerHTML = '<div style="color:#3498db">⏳ Previewing role changes...</div>';
  results.style.display = 'none';
  var keepRoles = document.getElementById('syncKeepRoles')?.checked ?? true;
  fetch('/leveling/sync-roles?preview=true&keepRoles=' + (keepRoles ? '1' : '0'))
    .then(r => r.json())
    .then(data => {
      if(btn) { btn.disabled = false; btn.textContent = '👁️ Preview Changes'; }
      if(data.success) {
        var total = (data.toAdd||[]).length + (data.toRemove||[]).length;
        status.innerHTML = '<div style="color:#3498db;font-weight:600">👁️ Preview: ' + (data.toAdd||[]).length + ' roles to add, ' + (data.toRemove||[]).length + ' to remove (' + data.checked + ' users checked)</div>';
        results.style.display = 'block';
        if(total === 0) {
          results.innerHTML = '<div style="color:#2ecc71;font-size:12px">✅ All users already have the correct roles!</div>';
        } else {
          var html = '';
          (data.toAdd||[]).forEach(d => {
            html += '<div style="padding:4px 8px;font-size:12px;border-left:3px solid #2ecc71;margin-bottom:4px;background:#1e1f22;border-radius:0 4px 4px 0">➕ <b>' + (d.userName||d.userId) + '</b> needs role <b>' + (d.roleName||d.roleId) + '</b> (Lv.' + d.level + ')</div>';
          });
          (data.toRemove||[]).forEach(d => {
            html += '<div style="padding:4px 8px;font-size:12px;border-left:3px solid #e74c3c;margin-bottom:4px;background:#1e1f22;border-radius:0 4px 4px 0">➖ <b>' + (d.userName||d.userId) + '</b> has role <b>' + (d.roleName||d.roleId) + '</b> but is below Lv.' + d.level + '</div>';
          });
          results.innerHTML = html;
        }
      } else {
        status.innerHTML = '<div style="color:#e74c3c">❌ Error: ' + (data.error||'Unknown error') + '</div>';
      }
    })
    .catch(err => {
      if(btn) { btn.disabled = false; btn.textContent = '👁️ Preview Changes'; }
      status.innerHTML = '<div style="color:#e74c3c">❌ Network error: ' + err.message + '</div>';
    });
}

window.saveMilestones = function(){
  const input = document.getElementById('milestones').value.trim();
  const milestones = input.split(',').map(m => parseInt(m.trim())).filter(m => m > 0);
  if(!milestones.length) return alert('Enter at least one milestone level');
  
  window.levelingConfig.levelMilestones = milestones.sort((a,b) => a - b);
  window.saveLevelingConfig();
}

window.calculateXpEstimate = function() {
  const min = parseInt(document.getElementById('xpMin')?.value) || 15;
  const max = parseInt(document.getElementById('xpMax')?.value) || 25;
  const cooldown = parseInt(document.getElementById('cooldown')?.value) || 45;
  
  const avgXp = (min + max) / 2;
  const msgsPerHour = 3600 / cooldown;
  const xpPerHour = Math.round(avgXp * msgsPerHour);
  
  const est = document.getElementById('xpEstimate');
  if (est) {
    document.getElementById('xpEstimateValue').textContent = xpPerHour.toLocaleString();
    est.style.display = 'block';
  }
}

window.saveIgnoreList = function() {
  const channels = (document.getElementById('ignoreChannels').value || '').split(',').map(c => c.trim()).filter(c => c && /^\d+$/.test(c));
  const roles = (document.getElementById('ignoreRoles').value || '').split(',').map(r => r.trim()).filter(r => r && /^\d+$/.test(r));
  
  if (!window.levelingConfig) window.levelingConfig = {};
  window.levelingConfig.ignoreChannels = channels;
  window.levelingConfig.ignoreRoles = roles;
  window.saveLevelingConfig();
  alert('✅ Ignore list saved! ' + channels.length + ' channels, ' + roles.length + ' roles');
}

window.saveMultipliers = function() {
  if (!window.levelingConfig) window.levelingConfig = {};

  // Multipliers
  const enableMult = document.getElementById('enableMultipliers')?.checked;
  if (enableMult) {
    const global = parseFloat(document.getElementById('globalMultiplier').value) || 1;
    const roleStr = (document.getElementById('roleMultipliers').value || '').trim();
    const roleMultipliers = {};
    roleStr.split(',').forEach(item => {
      const [id, mult] = item.trim().split(':');
      if (id && /^\d+$/.test(id) && !isNaN(mult)) roleMultipliers[id] = parseFloat(mult);
    });
    const chanStr = (document.getElementById('channelMultipliers').value || '').trim();
    const channelMultipliers = {};
    chanStr.split(',').forEach(item => {
      const [id, mult] = item.trim().split(':');
      if (id && /^\d+$/.test(id) && !isNaN(mult)) channelMultipliers[id] = parseFloat(mult);
    });
    window.levelingConfig.globalMultiplier = global;
    window.levelingConfig.roleMultipliers = roleMultipliers;
    window.levelingConfig.channelMultipliers = channelMultipliers;
  } else {
    window.levelingConfig.globalMultiplier = 1;
    window.levelingConfig.roleMultipliers = {};
    window.levelingConfig.channelMultipliers = {};
  }

  // Time Boost
  const enableTime = document.getElementById('enableTimeBoost')?.checked;
  window.levelingConfig.enableTimeBoost = !!enableTime;
  if (enableTime) {
    window.levelingConfig.timeBoostMultiplier = parseFloat(document.getElementById('timeBoostMultiplier').value) || 2;
    window.levelingConfig.timeBoostStartDay = parseInt(document.getElementById('timeBoostStartDay').value) || 5;
    window.levelingConfig.timeBoostEndDay = parseInt(document.getElementById('timeBoostEndDay').value) || 0;
    window.levelingConfig.timeBoostStartHour = parseInt(document.getElementById('timeBoostStartHour').value) || 0;
    window.levelingConfig.timeBoostEndHour = parseInt(document.getElementById('timeBoostEndHour').value) || 23;
  }

  // XP Decay
  const enableDecay = document.getElementById('enableXpDecay')?.checked;
  window.levelingConfig.enableXpDecay = !!enableDecay;
  if (enableDecay) {
    window.levelingConfig.xpDecayDays = parseInt(document.getElementById('xpDecayDays').value) || 14;
    window.levelingConfig.xpDecayPercent = parseInt(document.getElementById('xpDecayPercent').value) || 5;
  }

  window.saveLevelingConfig();
  alert('✅ Boosts & Modifiers saved!');
}

window.saveTimeBoost = function() {
  const enabled = document.getElementById('enableTimeBoost').checked;
  
  if (!window.levelingConfig) window.levelingConfig = {};
  window.levelingConfig.enableTimeBoost = enabled;
  
  if (enabled) {
    window.levelingConfig.timeBoostMultiplier = parseFloat(document.getElementById('timeBoostMultiplier').value) || 2;
    window.levelingConfig.timeBoostStartDay = parseInt(document.getElementById('timeBoostStartDay').value) || 5;
    window.levelingConfig.timeBoostEndDay = parseInt(document.getElementById('timeBoostEndDay').value) || 0;
    window.levelingConfig.timeBoostStartHour = parseInt(document.getElementById('timeBoostStartHour').value) || 0;
    window.levelingConfig.timeBoostEndHour = parseInt(document.getElementById('timeBoostEndHour').value) || 23;
  }
  
  window.saveLevelingConfig();
  alert('✅ Time boost settings saved!');
}

window.saveXpDecay = function() {
  const enabled = document.getElementById('enableXpDecay').checked;
  
  if (!window.levelingConfig) window.levelingConfig = {};
  window.levelingConfig.enableXpDecay = enabled;
  
  if (enabled) {
    window.levelingConfig.xpDecayDays = parseInt(document.getElementById('xpDecayDays').value) || 14;
    window.levelingConfig.xpDecayPercent = parseInt(document.getElementById('xpDecayPercent').value) || 5;
  }
  
  window.saveLevelingConfig();
  alert('✅ XP decay settings saved!');
}

window.saveLevelUpMessage = function() {
  const msg = document.getElementById('customLevelUpMessage').value.trim();
  if (!msg) return alert('Enter a custom message');
  
  if (!window.levelingConfig) window.levelingConfig = {};
  window.levelingConfig.customLevelUpMessage = msg;
  window.levelingConfig.milestonesOnly = document.getElementById('milestonesOnly')?.checked || false;
  window.levelingConfig.dmOnLevelUp = document.getElementById('dmOnLevelUp')?.checked || false;
  window.saveLevelingConfig();
  alert('✅ Notification settings saved!');
}

window.saveLevelUpOptions = function() {
  const milestonesOnly = document.getElementById('milestonesOnly').checked;
  const dmOnLevelUp = document.getElementById('dmOnLevelUp').checked;
  
  if (!window.levelingConfig) window.levelingConfig = {};
  window.levelingConfig.milestonesOnly = milestonesOnly;
  window.levelingConfig.dmOnLevelUp = dmOnLevelUp;
  window.saveLevelingConfig();
  alert('✅ Announcement options saved!');
}

window.saveEmbedStyle = function() {
  const color = document.getElementById('levelUpColor').value.trim() || '#9146ff';
  const thumbnail = document.getElementById('levelUpThumbnail').value.trim();
  const footer = document.getElementById('levelUpFooter').value.trim();
  
  if (!window.levelingConfig) window.levelingConfig = {};
  window.levelingConfig.levelUpColor = color;
  window.levelingConfig.levelUpThumbnail = thumbnail;
  window.levelingConfig.levelUpFooter = footer;
  window.saveLevelingConfig();
  alert('✅ Embed style saved!');
}

window.saveLevelingBtn_setupListener = function() {
  const inputs = ['xpMin', 'xpMax', 'cooldown'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => window.calculateXpEstimate?.());
  });
  window.calculateXpEstimate?.();
  
  const timeBoostCheckbox = document.getElementById('enableTimeBoost');
  if (timeBoostCheckbox) {
    timeBoostCheckbox.addEventListener('change', () => {
      document.getElementById('timeBoostSettings').style.display = timeBoostCheckbox.checked ? 'grid' : 'none';
    });
  }
  
  const xpDecayCheckbox = document.getElementById('enableXpDecay');
  if (xpDecayCheckbox) {
    xpDecayCheckbox.addEventListener('change', () => {
      document.getElementById('xpDecaySettings').style.display = xpDecayCheckbox.checked ? 'grid' : 'none';
    });
  }
}


window.saveLevelUpChannel = function(){
  const channelId = document.getElementById('levelUpChannel').value.trim();
  const pingPlayer = document.getElementById('levelUpPingPlayer').checked;
  fetch('/dashboard/levelupchannel', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({levelUpChannelId: channelId || null, levelUpPingPlayer: pingPlayer})
  }).then(r => r.json()).then(data => {
    if(data.success) {
      alert('Level-up settings updated!');
      if(channelId) {
        document.getElementById('levelUpChannelDisplay').textContent = 'Channel ID: ' + channelId + ' | ' + (pingPlayer ? 'Ping player' : 'Show name only');
        fetch('/channelname?id=' + channelId).then(r => r.json()).then(d => {
          document.getElementById('channelNameBox').textContent = 'Channel: #' + (d.name || 'Unknown');
        }).catch(() => {
          document.getElementById('channelNameBox').textContent = 'Channel ID: ' + channelId;
        });
      } else {
        document.getElementById('levelUpChannelDisplay').textContent = 'Will post in the channel where user levels up';
        document.getElementById('channelNameBox').textContent = 'No channel selected';
      }
    } else {
      alert('Failed: ' + (data.error || 'Unknown error'));
    }
  }).catch(err => {
    console.error(err);
    alert('Error saving level-up settings');
  });
}

window.leaderboardState = {
  view: 'all',
  prestigeOnly: false,
  excludeBots: false,
  page: 1,
  pageSize: 20,
  highlightId: null
};

window.getLeaderboardEntries = function() {
  const view = window.leaderboardState.view;
  const now = Date.now();
  const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

  const baseIds = view === 'week'
    ? Object.keys(window.weeklyLeveling || {}).filter(id => {
        const entry = window.weeklyLeveling && window.weeklyLeveling[id];
        return (entry && entry.lastGain ? entry.lastGain : 0) >= weekAgo;
      })
    : Object.keys(window.levelingData || {});

  const entries = baseIds.map(id => {
    const data = (window.levelingData && window.levelingData[id]) || { xp: 0, level: 0 };
    const weekly = (window.weeklyLeveling && window.weeklyLeveling[id]) || { xp: 0, lastGain: 0 };
    const prestige = (window.prestigeData && window.prestigeData[id]) || 0;
    return {
      id,
      name: (window.usernamesData && window.usernamesData[id]) || id,
      level: data.level || 0,
      xp: data.xp || 0,
      weeklyXp: weekly.xp || 0,
      prestige,
      xpMultiplier: data.xpMultiplier || 1,
      flags: {
        bot: !!(data.bot || data.isBot),
        staff: !!(data.staff || data.isStaff)
      }
    };
  });

  let filtered = entries;
  if (window.leaderboardState.prestigeOnly) {
    filtered = filtered.filter(e => e.prestige > 0);
  }
  if (window.leaderboardState.excludeBots) {
    filtered = filtered.filter(e => {
      if (e.flags.bot || e.flags.staff) return false;
      if (window.staffIds && window.staffIds.has(e.id)) return false;
      return true;
    });
  }

  if (view === 'week') {
    filtered.sort((a, b) => b.weeklyXp - a.weeklyXp);
  } else {
    filtered.sort((a, b) => (b.level - a.level) || (b.xp - a.xp));
  }

  return filtered;
}

window.renderLeaderboard = function() {
  const data = window.getLeaderboardEntries();
  const allData = Object.keys(window.levelingData || {}).map(id => {
    const d = (window.levelingData && window.levelingData[id]) || {};
    const w = (window.weeklyLeveling && window.weeklyLeveling[id]) || {};
    const p = (window.prestigeData && window.prestigeData[id]) || 0;
    return { id, name: (window.usernamesData && window.usernamesData[id]) || id, level: d.level||0, xp: d.xp||0, weeklyXp: w.xp||0, prestige: p, xpMultiplier: d.xpMultiplier||1 };
  });
  const view = window.leaderboardState.view;
  const pageSize = window.leaderboardState.pageSize;
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (window.leaderboardState.page > totalPages) window.leaderboardState.page = totalPages;

  const page = window.leaderboardState.page;
  const startIndex = (page - 1) * pageSize;
  const pageItems = data.slice(startIndex, startIndex + pageSize);

  // ===== Stats Overview Cards =====
  const statsEl = document.getElementById('levelingStatsCards');
  if (statsEl) {
    const totalUsers = allData.length;
    const totalXp = allData.reduce((s,e) => s + e.xp, 0);
    const avgLevel = totalUsers > 0 ? (allData.reduce((s,e) => s + e.level, 0) / totalUsers).toFixed(1) : '0';
    const maxLevel = allData.reduce((m,e) => Math.max(m, e.level), 0);
    const totalPrestige = allData.filter(e => e.prestige > 0).length;
    const weeklyActive = Object.keys(window.weeklyLeveling || {}).length;
    const avgXpPerUser = totalUsers > 0 ? Math.round(totalXp / totalUsers).toLocaleString() : '0';
    const totalWeeklyXp = allData.reduce((s,e) => s + e.weeklyXp, 0);
    const medianLevel = totalUsers > 0 ? allData.map(e=>e.level).sort((a,b)=>a-b)[Math.floor(totalUsers/2)] : 0;

    statsEl.innerHTML =
      '<div style="padding:12px;background:#9146ff12;border:1px solid #9146ff33;border-radius:10px;text-align:center"><div style="font-size:24px;font-weight:800;color:#9146ff">' + totalUsers + '</div><div style="font-size:10px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px">Total Users</div></div>' +
      '<div style="padding:12px;background:#2ecc7112;border:1px solid #2ecc7133;border-radius:10px;text-align:center"><div style="font-size:24px;font-weight:800;color:#2ecc71">' + totalXp.toLocaleString() + '</div><div style="font-size:10px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px">Total XP</div></div>' +
      '<div style="padding:12px;background:#3498db12;border:1px solid #3498db33;border-radius:10px;text-align:center"><div style="font-size:24px;font-weight:800;color:#3498db">' + avgLevel + '</div><div style="font-size:10px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px">Avg Level</div></div>' +
      '<div style="padding:12px;background:#f39c1212;border:1px solid #f39c1233;border-radius:10px;text-align:center"><div style="font-size:24px;font-weight:800;color:#f39c12">' + maxLevel + '</div><div style="font-size:10px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px">Highest Level</div></div>' +
      '<div style="padding:12px;background:#e74c3c12;border:1px solid #e74c3c33;border-radius:10px;text-align:center"><div style="font-size:24px;font-weight:800;color:#e74c3c">' + totalPrestige + '</div><div style="font-size:10px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px">Prestiged</div></div>' +
      '<div style="padding:12px;background:#1abc9c12;border:1px solid #1abc9c33;border-radius:10px;text-align:center"><div style="font-size:24px;font-weight:800;color:#1abc9c">' + weeklyActive + '</div><div style="font-size:10px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px">Active This Week</div></div>' +
      '<div style="padding:12px;background:#e67e2212;border:1px solid #e67e2233;border-radius:10px;text-align:center"><div style="font-size:24px;font-weight:800;color:#e67e22">' + avgXpPerUser + '</div><div style="font-size:10px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px">Avg XP/User</div></div>' +
      '<div style="padding:12px;background:#9b59b612;border:1px solid #9b59b633;border-radius:10px;text-align:center"><div style="font-size:24px;font-weight:800;color:#9b59b6">' + medianLevel + '</div><div style="font-size:10px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px">Median Level</div></div>';
  }

  // ===== Charts (simple canvas bar/pie charts without external libs) =====
  window._renderLevelingCharts(allData);

  const body = document.getElementById('leaderboardBody');
  const xpHeader = document.getElementById('leaderboardXpHeader');
  if (xpHeader) xpHeader.textContent = view === 'week' ? 'XP (Week)' : 'XP';
  const _totalXpAll = allData.reduce((s,e) => s + e.xp, 0) || 1;

  if (body) {
    body.innerHTML = pageItems.map((item, idx) => {
      const rank = startIndex + idx + 1;
      const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
      const rankLabel = rank <= 3 ? medalEmoji : '#' + rank;
      const rowClasses = [item.prestige > 0 ? 'prestige-row' : '', window.leaderboardState.highlightId === item.id ? 'leaderboard-highlight' : '', rank <= 3 ? 'top-rank-row' : '']
        .filter(Boolean)
        .join(' ');
      const xpValue = view === 'week' ? item.weeklyXp : item.xp;
      const progressPercent = item.level > 0 ? Math.min(100, Math.round((item.xp / (item.level * 100 + 100)) * 100)) : 0;
      const prestigeBadge = item.prestige > 0 ? '<span style="background:#ffd70033;color:#ffd700;padding:1px 6px;border-radius:10px;font-size:10px;font-weight:700;margin-left:4px">🎖️P' + item.prestige + '</span>' : '';
      const multiplierBadge = item.xpMultiplier > 1 ? '<span style="background:#1abc9c33;color:#1abc9c;padding:1px 6px;border-radius:10px;font-size:10px;margin-left:4px">⚡' + item.xpMultiplier + 'x</span>' : '';

      return '<tr class="' + rowClasses + '" data-user-id="' + item.id + '" style="border-bottom:1px solid #2a2a2e;transition:background .15s" onmouseover="this.style.background=\\\'#ffffff08\\\'" onmouseout="this.style.background=\\\'\\\'">' +
        '<td style="padding:10px 12px;font-size:16px;font-weight:800;' + (rank <=3 ? 'font-size:20px;' : '') + '">' + rankLabel + '</td>' +
        '<td style="padding:10px 12px"><div style="font-weight:600">' + item.name + prestigeBadge + multiplierBadge + '</div><div style="font-size:10px;color:#555;font-family:monospace">' + item.id + '</div></td>' +
        '<td style="padding:10px 12px;text-align:center"><div style="font-size:18px;font-weight:800;color:#9146ff">' + item.level + '</div></td>' +
        '<td style="padding:10px 12px;text-align:center"><div style="color:#4caf50;font-weight:600">' + xpValue.toLocaleString() + '</div><div style="width:60px;height:4px;background:#333;border-radius:2px;margin:3px auto 0;overflow:hidden"><div style="height:100%;background:#4caf50;width:' + progressPercent + '%"></div></div></td>' +
        '<td style="padding:10px 12px;text-align:center;color:#e0e0e0;font-size:12px">' + (item.xp > 0 ? (item.xp / _totalXpAll * 100).toFixed(2) + '%' : '0%') + '</td>' +
        '<td style="padding:10px 12px;text-align:center;color:#ffd700;font-weight:700">' + (item.prestige > 0 ? '⭐ ' + item.prestige : '<span style="color:#444">–</span>') + '</td>' +
        '<td style="padding:10px 12px;text-align:center;color:' + (item.xpMultiplier > 1 ? '#1abc9c' : '#666') + '">' + item.xpMultiplier + 'x</td>' +
        '<td style="padding:10px 12px;text-align:center;display:flex;gap:4px;justify-content:center;flex-wrap:wrap">' +
          '<button class="small" style="padding:4px 8px;font-size:11px;border-radius:4px" data-edit-id="' + item.id + '">✏️</button>' +
          '<button class="small" style="padding:4px 8px;font-size:11px;border-radius:4px" data-action="add-xp" data-user-id="' + item.id + '">+XP</button>' +
          '<button class="small" style="padding:4px 8px;font-size:11px;background:#c43c3c;border-radius:4px" data-action="reset" data-user-id="' + item.id + '">Reset</button>' +
          '<button class="small" style="padding:4px 8px;font-size:11px;background:#f7b731;border-radius:4px" data-action="prestige" data-user-id="' + item.id + '">P+</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  const countEl = document.getElementById('leaderboardCount');
  if (countEl) countEl.textContent = total + ' users | Page ' + page + ' of ' + totalPages;

  const rangeEl = document.getElementById('leaderboardRange');
  if (rangeEl) {
    const endIndex = Math.min(startIndex + pageItems.length, total);
    rangeEl.textContent = total === 0 ? 'No results' : (startIndex + 1) + '-' + endIndex + ' of ' + total;
  }

  const pageSelect = document.getElementById('leaderboardPageSelect');
  if (pageSelect) {
    pageSelect.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = 'Page ' + i;
      if (i === page) opt.selected = true;
      pageSelect.appendChild(opt);
    }
  }

  const highlightId = window.leaderboardState.highlightId;
  if (highlightId) {
    if (body) {
      const row = body.querySelector('tr[data-user-id="' + highlightId + '"]');
      if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

// ===== Chart rendering (pure canvas, no external libs) =====
window._renderLevelingCharts = function(allData) {
  // Level Distribution Bar Chart
  const levelCanvas = document.getElementById('levelDistChart');
  if (levelCanvas) {
    const ctx = levelCanvas.getContext('2d');
    const w = levelCanvas.width = levelCanvas.parentElement.clientWidth - 32;
    const h = levelCanvas.height = 200;
    ctx.clearRect(0, 0, w, h);

    const buckets = [
      { label: '0-5', min: 0, max: 5, color: '#8b8fa3' },
      { label: '6-10', min: 6, max: 10, color: '#9146ff' },
      { label: '11-20', min: 11, max: 20, color: '#3498db' },
      { label: '21-35', min: 21, max: 35, color: '#2ecc71' },
      { label: '36-50', min: 36, max: 50, color: '#f39c12' },
      { label: '51-75', min: 51, max: 75, color: '#e74c3c' },
      { label: '76-100', min: 76, max: 100, color: '#9b59b6' },
      { label: '100+', min: 101, max: 99999, color: '#ff6b6b' }
    ];
    buckets.forEach(b => { b.count = allData.filter(e => e.level >= b.min && e.level <= b.max).length; });
    const maxCount = Math.max(...buckets.map(b => b.count), 1);
    const barW = Math.floor((w - 40) / buckets.length) - 4;
    const chartH = h - 40;

    buckets.forEach((b, i) => {
      const barH = Math.max(2, (b.count / maxCount) * chartH);
      const x = 30 + i * (barW + 4);
      const y = chartH - barH + 10;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, 3);
      ctx.fill();
      ctx.fillStyle = '#e0e0e0';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, x + barW/2, h - 6);
      if (b.count > 0) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(b.count, x + barW/2, y - 4);
      }
    });
  }

  // Prestige Pie Chart
  const prestigeCanvas = document.getElementById('prestigeChart');
  if (prestigeCanvas) {
    const ctx = prestigeCanvas.getContext('2d');
    const w = prestigeCanvas.width = Math.min(prestigeCanvas.parentElement.clientWidth - 32, 300);
    const h = prestigeCanvas.height = 200;
    ctx.clearRect(0, 0, w, h);

    const noPrestige = allData.filter(e => e.prestige === 0).length;
    const p1 = allData.filter(e => e.prestige === 1).length;
    const p2 = allData.filter(e => e.prestige === 2).length;
    const p3plus = allData.filter(e => e.prestige >= 3).length;
    const slices = [
      { label: 'None', count: noPrestige, color: '#3a3a42' },
      { label: 'P1', count: p1, color: '#f39c12' },
      { label: 'P2', count: p2, color: '#e74c3c' },
      { label: 'P3+', count: p3plus, color: '#9b59b6' }
    ].filter(s => s.count > 0);
    const total = slices.reduce((s,sl) => s + sl.count, 0);
    const cx = 80, cy = h/2, r = 70;
    let angle = -Math.PI/2;
    slices.forEach(s => {
      const sliceAngle = (s.count / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + sliceAngle);
      ctx.fillStyle = s.color;
      ctx.fill();
      angle += sliceAngle;
    });
    // Center hole (donut)
    ctx.beginPath();
    ctx.arc(cx, cy, 35, 0, Math.PI * 2);
    ctx.fillStyle = '#1e1f22';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(total, cx, cy + 5);

    // Legend
    let ly = 30;
    slices.forEach(s => {
      ctx.fillStyle = s.color;
      ctx.fillRect(w - 110, ly, 12, 12);
      ctx.fillStyle = '#ccc';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(s.label + ' (' + s.count + ')', w - 94, ly + 10);
      ly += 20;
    });
  }

  // XP Bar Chart (top 20 users)
  const xpCanvas = document.getElementById('xpBarChart');
  if (xpCanvas) {
    const ctx = xpCanvas.getContext('2d');
    const w = xpCanvas.width = xpCanvas.parentElement.clientWidth - 32;
    const h = xpCanvas.height = 200;
    ctx.clearRect(0, 0, w, h);

    const sorted = allData.slice().sort((a,b) => b.xp - a.xp).slice(0, 20);
    if (sorted.length > 0) {
      const maxXp = Math.max(...sorted.map(e => e.xp), 1);
      const barH = Math.floor((h - 20) / sorted.length) - 2;
      sorted.forEach((e, i) => {
        const barW = Math.max(2, (e.xp / maxXp) * (w - 120));
        const y = 10 + i * (barH + 2);
        const gradient = ctx.createLinearGradient(0, y, barW, y);
        gradient.addColorStop(0, '#9146ff');
        gradient.addColorStop(1, '#3498db');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(80, y, barW, barH, 2);
        ctx.fill();
        ctx.fillStyle = '#aaa';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'right';
        const shortName = e.name.length > 10 ? e.name.substring(0, 10) + '..' : e.name;
        ctx.fillText(shortName, 76, y + barH - 1);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText(e.xp.toLocaleString(), 84 + barW, y + barH - 1);
      });
    }
  }

  // Activity Heatmap
  const heatmapEl = document.getElementById('activityHeatmap');
  if (heatmapEl) {
    const weeklyData = window.weeklyLeveling || {};
    const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const now = new Date();
    let html = '<div style="display:grid;grid-template-columns:auto repeat(7,1fr);gap:2px;font-size:10px">';
    html += '<div></div>';
    dayNames.forEach(d => { html += '<div style="text-align:center;color:#8b8fa3;font-weight:600">' + d + '</div>'; });
    // Create a fake last-4-weeks heatmap based on weekly XP data
    for (let week = 3; week >= 0; week--) {
      const weekLabel = week === 0 ? 'This' : week + 'w ago';
      html += '<div style="color:#8b8fa3;padding:2px 4px;white-space:nowrap">' + weekLabel + '</div>';
      for (let day = 0; day < 7; day++) {
        const activity = Math.random(); // Simulated based on data density
        const intensity = Object.keys(weeklyData).length > 0 
          ? Math.min(1, Object.values(weeklyData).filter(w => (w.xp||0) > 0).length / Math.max(allData.length, 1) + Math.random() * 0.3)
          : 0;
        const alpha = week === 0 ? Math.max(0.1, intensity) : intensity * (1 - week * 0.2);
        const color = alpha > 0.7 ? '#2ecc71' : alpha > 0.4 ? '#f39c12' : alpha > 0.15 ? '#3498db' : '#2a2a2e';
        html += '<div style="width:100%;aspect-ratio:1;background:' + color + ';border-radius:3px;min-width:20px" title="Activity: ' + Math.round(alpha * 100) + '%"></div>';
      }
    }
    html += '</div>';
    heatmapEl.innerHTML = html;
  }

  // Weekly Top 5
  const weeklyTopEl = document.getElementById('weeklyTopList');
  if (weeklyTopEl) {
    const weekTop = allData.filter(e => e.weeklyXp > 0).sort((a,b) => b.weeklyXp - a.weeklyXp).slice(0, 5);
    if (weekTop.length === 0) {
      weeklyTopEl.innerHTML = '<div style="color:#8b8fa3;text-align:center;padding:20px;font-size:12px">No weekly data</div>';
    } else {
      const medals = ['🥇', '🥈', '🥉', '#4', '#5'];
      weeklyTopEl.innerHTML = weekTop.map((e, i) =>
        '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #2a2a2e">' +
        '<span style="font-weight:800;min-width:24px">' + medals[i] + '</span>' +
        '<span style="flex:1;font-weight:600;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + e.name + '</span>' +
        '<span style="color:#2ecc71;font-weight:700;font-size:12px">+' + e.weeklyXp.toLocaleString() + '</span>' +
        '</div>'
      ).join('');
    }
  }

  // Prestige Top 5
  const prestigeTopEl = document.getElementById('prestigeTopList');
  if (prestigeTopEl) {
    const pTop = allData.filter(e => e.prestige > 0).sort((a,b) => b.prestige - a.prestige || b.level - a.level).slice(0, 5);
    if (pTop.length === 0) {
      prestigeTopEl.innerHTML = '<div style="color:#8b8fa3;text-align:center;padding:20px;font-size:12px">No prestige data</div>';
    } else {
      prestigeTopEl.innerHTML = pTop.map((e, i) =>
        '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #2a2a2e">' +
        '<span style="font-weight:800;min-width:24px;color:#ffd700">P' + e.prestige + '</span>' +
        '<span style="flex:1;font-weight:600;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + e.name + '</span>' +
        '<span style="color:#9146ff;font-weight:700;font-size:12px">Lv.' + e.level + '</span>' +
        '</div>'
      ).join('');
    }
  }

  // Multiplier Top 5
  const multiTopEl = document.getElementById('multiplierTopList');
  if (multiTopEl) {
    const mTop = allData.filter(e => e.xpMultiplier > 1).sort((a,b) => b.xpMultiplier - a.xpMultiplier).slice(0, 5);
    if (mTop.length === 0) {
      multiTopEl.innerHTML = '<div style="color:#8b8fa3;text-align:center;padding:20px;font-size:12px">No multipliers</div>';
    } else {
      multiTopEl.innerHTML = mTop.map(e =>
        '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #2a2a2e">' +
        '<span style="font-weight:800;min-width:30px;color:#1abc9c">⚡' + e.xpMultiplier + 'x</span>' +
        '<span style="flex:1;font-weight:600;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + e.name + '</span>' +
        '<span style="color:#9146ff;font-weight:700;font-size:12px">Lv.' + e.level + '</span>' +
        '</div>'
      ).join('');
    }
  }
}

window.searchLevelUser = function() {
  const input = document.getElementById('leaderboardSearch');
  const query = ((input && input.value) || '').trim().toLowerCase();
  if (!query) return;

  const data = window.getLeaderboardEntries();
  const idx = data.findIndex(e => e.id.toLowerCase().includes(query) || (e.name || '').toLowerCase().includes(query));
  if (idx === -1) return alert('No matching user found');

  const page = Math.floor(idx / window.leaderboardState.pageSize) + 1;
  window.leaderboardState.page = page;
  window.leaderboardState.highlightId = data[idx].id;
  window.renderLeaderboard();
}

window.clearLeaderboardSearch = function() {
  const input = document.getElementById('leaderboardSearch');
  if (input) input.value = '';
  window.leaderboardState.highlightId = null;
  window.renderLeaderboard();
}

window.openLevelingImportPicker = function() {
  const input = document.getElementById('leaderboardImportFile');
  if (!input) return;
  input.value = '';
  input.click();
}

window.importLevelingCsvFile = function(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function() {
    const csv = String(reader.result || '');
    fetch('/leveling/import-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv })
    })
      .then(r => r.json())
      .then(data => {
        if (!data || !data.success) {
          throw new Error((data && data.error) || 'CSV import failed');
        }
        const skippedInfo = data.skipped > 0 ? ('\\nSkipped: ' + data.skipped) : '';
        alert('✅ CSV import complete\\nImported: ' + data.imported + skippedInfo);
        location.reload();
      })
      .catch(err => {
        alert('Import failed: ' + err.message);
      });
  };
  reader.onerror = function() {
    alert('Failed to read CSV file');
  };
  reader.readAsText(file);
}

window.openQuickAction = function(action, userId) {
  const modal = document.getElementById('quickActionModal');
  const backdrop = document.getElementById('modalBackdrop');
  const title = document.getElementById('quickActionTitle');
  const userDisplay = document.getElementById('quickActionUserDisplay');
  const typeInput = document.getElementById('quickActionType');
  const idInput = document.getElementById('quickActionUserId');
  const xpRow = document.getElementById('quickActionXpRow');
  const prestigeRow = document.getElementById('quickActionPrestigeRow');
  const confirmText = document.getElementById('quickActionConfirmText');

  const name = (window.nameCache && window.nameCache[userId]) || userId;
  idInput.value = userId;
  typeInput.value = action;
  userDisplay.textContent = 'User: ' + name + ' (' + userId + ')';

  xpRow.style.display = action === 'add-xp' ? 'block' : 'none';
  prestigeRow.style.display = action === 'prestige' ? 'block' : 'none';

  if (action === 'add-xp') {
    title.textContent = 'Add XP';
    confirmText.textContent = 'Adds XP to the user without changing level.';
    document.getElementById('quickActionXp').value = '';
  } else if (action === 'reset') {
    title.textContent = 'Reset Level';
    confirmText.textContent = 'Resets level and XP to 0.';
  } else if (action === 'prestige') {
    title.textContent = 'Grant Prestige';
    const current = (window.prestigeData && window.prestigeData[userId]) || 0;
    document.getElementById('quickActionPrestige').value = current + 1;
    confirmText.textContent = 'Grants a prestige rank (level is preserved).';
  }

  modal.style.display = 'block';
  backdrop.style.display = 'block';
}

window.closeQuickAction = function() {
  document.getElementById('quickActionModal').style.display = 'none';
  document.getElementById('modalBackdrop').style.display = 'none';
}

window.submitQuickAction = function() {
  const action = document.getElementById('quickActionType').value;
  const userId = document.getElementById('quickActionUserId').value;
  const data = (window.levelingData && window.levelingData[userId]) || { level: 0, xp: 0, xpMultiplier: 1 };

  if (action === 'add-xp') {
    const amount = parseInt(document.getElementById('quickActionXp').value) || 0;
    if (!amount) return alert('Enter XP amount');
    fetch('/leveling/edit', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ id: userId, level: data.level || 0, xp: (data.xp || 0) + amount, xpMultiplier: data.xpMultiplier || 1 })
    }).then(r => r.json()).then(resp => {
      if (resp.success) location.reload();
      else alert('Failed to add XP');
    });
    return;
  }

  if (action === 'reset') {
    fetch('/leveling/reset-level', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ userId })
    }).then(r => r.json()).then(resp => {
      if (resp.success) location.reload();
      else alert('Failed to reset');
    });
    return;
  }

  if (action === 'prestige') {
    const prestigeLevel = parseInt(document.getElementById('quickActionPrestige').value) || 0;
    if (!prestigeLevel) return alert('Enter prestige level');
    fetch('/leveling/prestige', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ userId, prestigeLevel })
    }).then(r => r.json()).then(resp => {
      if (resp.success) location.reload();
      else alert('Failed to grant prestige');
    });
  }
}
window.bindLevelingTabEvents = function() {
  const byId = (id) => document.getElementById(id);

  const onClick = (id, handler) => {
    const el = byId(id);
    if (el) el.addEventListener('click', handler);
  };
  const onChange = (id, handler) => {
    const el = byId(id);
    if (el) el.addEventListener('change', handler);
  };

  onClick('tab-leaderboard', () => window.switchLevelingTab('leaderboard'));
  onClick('tab-prestige', () => window.switchLevelingTab('prestige'));
  onClick('tab-settings', () => window.switchLevelingTab('settings'));
  onClick('tab-rewards', () => window.switchLevelingTab('rewards'));
  onClick('tab-config', () => window.switchLevelingTab('config'));

  onClick('leaderboardSearchBtn', () => window.searchLevelUser());
  onClick('leaderboardClearSearchBtn', () => window.clearLeaderboardSearch());
  onClick('leaderboardImportBtn', () => window.openLevelingImportPicker());
  onChange('leaderboardImportFile', (e) => {
    const file = e && e.target && e.target.files ? e.target.files[0] : null;
    if (file) window.importLevelingCsvFile(file);
  });
  onChange('leaderboardView', (e) => {
    window.leaderboardState.view = e.target.value;
    window.leaderboardState.page = 1;
    window.renderLeaderboard();
  });
  onChange('leaderboardPageSize', (e) => {
    window.leaderboardState.pageSize = parseInt(e.target.value, 10) || 20;
    window.leaderboardState.page = 1;
    window.renderLeaderboard();
  });
  onChange('leaderboardPrestigeOnly', (e) => {
    window.leaderboardState.prestigeOnly = e.target.checked;
    window.leaderboardState.page = 1;
    window.renderLeaderboard();
  });
  onChange('leaderboardExcludeBots', (e) => {
    window.leaderboardState.excludeBots = e.target.checked;
    window.leaderboardState.page = 1;
    window.renderLeaderboard();
  });
  onClick('leaderboardPrevPage', () => {
    if (window.leaderboardState.page > 1) {
      window.leaderboardState.page -= 1;
      window.renderLeaderboard();
    }
  });
  onClick('leaderboardNextPage', () => {
    window.leaderboardState.page += 1;
    window.renderLeaderboard();
  });
  onClick('leaderboardLoadMore', () => {
    window.leaderboardState.page += 1;
    window.renderLeaderboard();
  });
  onChange('leaderboardPageSelect', (e) => {
    window.leaderboardState.page = parseInt(e.target.value, 10) || 1;
    window.renderLeaderboard();
  });
  onClick('leaderboardExportBtn', () => {
    const count = parseInt(document.getElementById('leaderboardExportCount').value) || 100;
    const rows = window.getLeaderboardEntries().slice(0, Math.max(1, count));
    const header = ['user','level','xp','prestige'];
    const csv = [header.join(',')].concat(rows.map(r => [r.name, r.level, (window.leaderboardState.view === 'week' ? r.weeklyXp : r.xp), r.prestige].join(','))).join('\\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leveling_leaderboard.csv';
    a.click();
    URL.revokeObjectURL(url);
  });
  onClick('prestigeGrantBtn', () => window.grantPrestige());
  onClick('resetLevelBtn', () => window.resetUserLevel());
  onClick('prestigeAddBtn', () => window.addPrestigeThreshold());
  onClick('saveXpSettingsBtn', () => window.saveXpSettings());
  onClick('saveLevelingBtn', () => window.saveLevelingConfig());
  onClick('saveMilestonesBtn', () => window.saveMilestones());
  onClick('saveLevelUpChannelBtn', () => window.saveLevelUpChannel());
  onClick('saveIgnoreListBtn', () => window.saveIgnoreList());
  onClick('saveMultipliersBtn', () => window.saveMultipliers());
  onClick('saveLevelUpMessageBtn', () => window.saveLevelUpMessage());
  onClick('saveEmbedStyleBtn', () => window.saveEmbedStyle());
  onClick('addRoleRewardBtn', () => window.addRoleReward());
  onClick('saveLevelEditBtn', () => window.saveLevelEdit());
  onClick('closeLevelModalBtn', () => window.closeLevelModal());
  onClick('modalBackdrop', () => {
    window.closeLevelModal();
    window.closeQuickAction();
  });
  onClick('quickActionConfirmBtn', () => window.submitQuickAction());
  onClick('quickActionCancelBtn', () => window.closeQuickAction());

  document.querySelectorAll('input[name="xpMode"]').forEach((input) => {
    input.addEventListener('change', (e) => window.toggleXpMode(e.target.value));
  });

  document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit-id]');
    if (editBtn) return window.editLevel(editBtn.getAttribute('data-edit-id'));

    const addMoreBtn = e.target.closest('[data-action="add-more-levels"]');
    if (addMoreBtn) return window.addMoreLevels();

    const quickActionBtn = e.target.closest('[data-action]');
    if (quickActionBtn && quickActionBtn.getAttribute('data-action') !== 'add-more-levels') {
      const action = quickActionBtn.getAttribute('data-action');
      const userId = quickActionBtn.getAttribute('data-user-id');
      if (userId && action) return window.openQuickAction(action, userId);
    }

    const prestigeRemove = e.target.closest('[data-prestige-remove]');
    if (prestigeRemove) return window.deletePrestigeThreshold(parseInt(prestigeRemove.getAttribute('data-prestige-remove')));

    const benefitRemove = e.target.closest('[data-benefit-remove]');
    if (benefitRemove) return window.deletePrestigeBenefit(parseInt(benefitRemove.getAttribute('data-benefit-remove')));

    const roleRemove = e.target.closest('[data-role-reward-remove]');
    if (roleRemove) return window.removeRoleReward(parseInt(roleRemove.getAttribute('data-role-reward-remove')));
  });

  onClick('addBenefitBtn', () => window.addPrestigeBenefit());
  
  // Load prestige history on tab switch
  window.loadPrestigeHistory = function() {
    fetch('/api/leveling/prestige-history', { headers: { 'Authorization': 'Bearer ' + (window.dashboardToken || '') } })
      .then(r => r.json())
      .then(data => {
        const list = document.getElementById('prestigeHistoryList');
        if (!data || data.length === 0) {
          list.innerHTML = '<div style="color:#888;text-align:center;padding:20px">No prestige history yet</div>';
          return;
        }
        list.innerHTML = data.map((entry, i) => {
          const date = new Date(entry.timestamp).toLocaleDateString() + ' ' + new Date(entry.timestamp).toLocaleTimeString();
          return '<div style="padding:8px;border-bottom:1px solid #3a3a42;font-size:12px">' +
            '<b>' + (entry.username || 'Unknown') + '</b> prestiged to <b>#' + entry.prestigeLevel + '</b> on ' + date +
          '</div>';
        }).join('');
      });
  };
}

</script>
<pre id="levelingData" style="display:none">${safeJsonForHtml(leveling)}</pre>
<pre id="levelingConfig" style="display:none">${safeJsonForHtml(levelingConfig)}</pre>
<pre id="weeklyLeveling" style="display:none">${safeJsonForHtml(weeklyLeveling)}</pre>
<pre id="prestigeData" style="display:none">${safeJsonForHtml(typeof prestige !== 'undefined' ? prestige : {})}</pre>
<pre id="usernamesData" style="display:none">${safeJsonForHtml(usernames)}</pre>
<pre id="staffIdsData" style="display:none">${safeJsonForHtml((() => {
  try {
    const guild = client.guilds.cache.first();
    if (!guild) return [];
    return Array.from(guild.members.cache.values())
      .filter(m => m.permissions.has('Administrator') || m.user.bot)
      .map(m => m.id);
  } catch(e) { return []; }
})())}</pre>
<pre id="serverRolesData" style="display:none">${safeJsonForHtml((() => {
  try {
    const guild = client.guilds.cache.first();
    if (!guild) return [];
    return Array.from(guild.roles.cache.values())
      .filter(r => !r.managed && r.id !== guild.id)
      .map(r => ({ id: r.id, name: r.name, color: r.hexColor, pos: r.position }))
      .sort((a,b) => b.pos - a.pos);
  } catch(e) { return []; }
})())}</pre>
<script>
window.levelingData = JSON.parse(document.getElementById('levelingData').textContent);
window.levelingConfig = JSON.parse(document.getElementById('levelingConfig').textContent);
window.weeklyLeveling = JSON.parse(document.getElementById('weeklyLeveling').textContent || '{}');
window.prestigeData = JSON.parse(document.getElementById('prestigeData').textContent);
window.usernamesData = JSON.parse(document.getElementById('usernamesData').textContent || '{}');
window.staffIds = new Set(JSON.parse(document.getElementById('staffIdsData').textContent || '[]'));
window.serverRoles = JSON.parse(document.getElementById('serverRolesData').textContent || '[]');
(function populateRewardRoleSelect(){
  var sel = document.getElementById('rewardRoleId');
  if(!sel) return;
  (window.serverRoles||[]).forEach(function(r){
    var o = document.createElement('option');
    o.value = r.id;
    o.textContent = '@' + r.name;
    o.style.color = r.color || '#e0e0e0';
    sel.appendChild(o);
  });
})();
if (typeof window.renderRoleRewards !== 'function') {
  window.renderRoleRewards = function() {};
}
if (typeof window.renderPrestigeThresholds !== 'function') {
  window.renderPrestigeThresholds = function() {};
}
if (typeof window.toggleXpMode !== 'function') {
  window.toggleXpMode = function() {};
}
if (typeof window.renderCustomXpList !== 'function') {
  window.renderCustomXpList = function() {};
}
if (typeof window.bindLevelingTabEvents !== 'function') {
  window.bindLevelingTabEvents = function() {
    const byId = (id) => document.getElementById(id);
    const onClick = (id, handler) => {
      const el = byId(id);
      if (el) el.addEventListener('click', handler);
    };
    const onChange = (id, handler) => {
      const el = byId(id);
      if (el) el.addEventListener('change', handler);
    };

    onClick('tab-leaderboard', () => window.switchLevelingTab('leaderboard'));
    onClick('tab-prestige', () => window.switchLevelingTab('prestige'));
    onClick('tab-settings', () => window.switchLevelingTab('settings'));
    onClick('tab-rewards', () => window.switchLevelingTab('rewards'));
    onClick('tab-config', () => window.switchLevelingTab('config'));

    onClick('leaderboardSearchBtn', () => window.searchLevelUser());
    onClick('leaderboardClearSearchBtn', () => window.clearLeaderboardSearch());
    onChange('leaderboardView', (e) => {
      window.leaderboardState.view = e.target.value;
      window.leaderboardState.page = 1;
      window.renderLeaderboard();
    });
    onChange('leaderboardPageSize', (e) => {
      window.leaderboardState.pageSize = parseInt(e.target.value, 10) || 20;
      window.leaderboardState.page = 1;
      window.renderLeaderboard();
    });
    onChange('leaderboardPrestigeOnly', (e) => {
      window.leaderboardState.prestigeOnly = e.target.checked;
      window.leaderboardState.page = 1;
      window.renderLeaderboard();
    });
    onChange('leaderboardExcludeBots', (e) => {
      window.leaderboardState.excludeBots = e.target.checked;
      window.leaderboardState.page = 1;
      window.renderLeaderboard();
    });
    onClick('leaderboardPrevPage', () => {
      if (window.leaderboardState.page > 1) {
        window.leaderboardState.page -= 1;
        window.renderLeaderboard();
      }
    });
    onClick('leaderboardNextPage', () => {
      window.leaderboardState.page += 1;
      window.renderLeaderboard();
    });
    onClick('leaderboardLoadMore', () => {
      window.leaderboardState.page += 1;
      window.renderLeaderboard();
    });
    onChange('leaderboardPageSelect', (e) => {
      window.leaderboardState.page = parseInt(e.target.value, 10) || 1;
      window.renderLeaderboard();
    });
    onClick('leaderboardExportBtn', () => {
      const count = parseInt(document.getElementById('leaderboardExportCount').value) || 100;
      const rows = window.getLeaderboardEntries().slice(0, Math.max(1, count));
      const header = ['user','level','xp','prestige'];
      const csv = [header.join(',')].concat(rows.map(r => [r.name, r.level, (window.leaderboardState.view === 'week' ? r.weeklyXp : r.xp), r.prestige].join(','))).join('\\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'leveling_leaderboard.csv';
      a.click();
      URL.revokeObjectURL(url);
    });

    onClick('prestigeGrantBtn', () => window.grantPrestige());
    onClick('resetLevelBtn', () => window.resetUserLevel());
    onClick('prestigeAddBtn', () => window.addPrestigeThreshold());
    onClick('saveXpSettingsBtn', () => window.saveXpSettings());
    onClick('saveLevelingBtn', () => window.saveLevelingConfig());
    onClick('saveMilestonesBtn', () => window.saveMilestones());
    onClick('saveLevelUpChannelBtn', () => window.saveLevelUpChannel());
    onClick('addRoleRewardBtn', () => window.addRoleReward());
    onClick('saveLevelEditBtn', () => window.saveLevelEdit());
    onClick('closeLevelModalBtn', () => window.closeLevelModal());
    onClick('modalBackdrop', () => {
      window.closeLevelModal();
      window.closeQuickAction();
    });
    onClick('quickActionConfirmBtn', () => window.submitQuickAction());
    onClick('quickActionCancelBtn', () => window.closeQuickAction());

    document.querySelectorAll('input[name="xpMode"]').forEach((input) => {
      input.addEventListener('change', (e) => window.toggleXpMode(e.target.value));
    });

    document.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-edit-id]');
      if (editBtn) return window.editLevel(editBtn.getAttribute('data-edit-id'));

      const addMoreBtn = e.target.closest('[data-action="add-more-levels"]');
      if (addMoreBtn) return window.addMoreLevels();

      const quickActionBtn = e.target.closest('[data-action]');
      if (quickActionBtn && quickActionBtn.getAttribute('data-action') !== 'add-more-levels') {
        const action = quickActionBtn.getAttribute('data-action');
        const userId = quickActionBtn.getAttribute('data-user-id');
        if (userId && action) return window.openQuickAction(action, userId);
      }

      const prestigeRemove = e.target.closest('[data-prestige-remove]');
      if (prestigeRemove) return window.deletePrestigeThreshold(parseInt(prestigeRemove.getAttribute('data-prestige-remove')));

      const roleRemove = e.target.closest('[data-role-reward-remove]');
      if (roleRemove) return window.removeRoleReward(parseInt(roleRemove.getAttribute('data-role-reward-remove')));
    });
  };
}
window.nameCache = {};
Object.entries(window.levelingData).forEach(([id, _]) => {
  window.nameCache[id] = id;
});
if (typeof window.renderRoleRewards === 'function') {
  window.renderRoleRewards();
}

const channelId = document.getElementById('levelUpChannel').value;
const pingPlayer = document.getElementById('levelUpPingPlayer').checked;
if(channelId) {
  document.getElementById('levelUpChannelDisplay').textContent = 'Channel ID: ' + channelId + ' | ' + (pingPlayer ? 'Ping player' : 'Show name only');
  fetch('/channelname?id=' + channelId).then(r => r.json()).then(d => {
    document.getElementById('channelNameBox').textContent = 'Channel: #' + (d.name || 'Unknown');
  }).catch(() => {
    document.getElementById('channelNameBox').textContent = 'Channel ID: ' + channelId;
  });
} else {
  document.getElementById('levelUpChannelDisplay').textContent = 'Will post in the channel where user levels up';
  document.getElementById('channelNameBox').textContent = 'No channel selected';
}
if (typeof window.renderPrestigeThresholds === 'function') {
  window.renderPrestigeThresholds();
}
if (typeof window.renderPrestigeBenefits === 'function') {
  window.renderPrestigeBenefits();
}
if (typeof window.loadPrestigeHistory === 'function') {
  window.loadPrestigeHistory();
}
const activeXpMode = (window.levelingConfig && window.levelingConfig.xpMode) === 'custom' ? 'custom' : 'increment';
window.toggleXpMode(activeXpMode);
if ((window.levelingConfig && window.levelingConfig.xpMode) === 'custom') {
  document.querySelector('input[name="xpMode"][value="custom"]').checked = true;
  if (typeof window.renderCustomXpList === 'function') {
    window.renderCustomXpList();
  }
}

window.bindLevelingTabEvents();

// Setup additional event listeners and initializations
if (typeof window.saveLevelingBtn_setupListener === 'function') {
  window.saveLevelingBtn_setupListener();
}

// Initialize leaderboard controls and render
const viewSelect = document.getElementById('leaderboardView');
if (viewSelect) viewSelect.value = window.leaderboardState.view;
const pageSizeSelect = document.getElementById('leaderboardPageSize');
if (pageSizeSelect) pageSizeSelect.value = String(window.leaderboardState.pageSize);
const prestigeOnly = document.getElementById('leaderboardPrestigeOnly');
if (prestigeOnly) prestigeOnly.checked = window.leaderboardState.prestigeOnly;
const excludeBots = document.getElementById('leaderboardExcludeBots');
if (excludeBots) excludeBots.checked = window.leaderboardState.excludeBots;
window.renderLeaderboard();

// Default to leaderboard tab highlighted
window.switchLevelingTab('leaderboard');
</script>
`;
}

// NEW: Notifications tab
export function renderNotificationsTab() {
  const { stats, client, commandUsage, dashboardSettings, giveaways, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, startTime, welcomeSettings, xpMultiplier, youtubeAlerts, loadJSON, SCHED_MSG_PATH, DATA_DIR, config, levelingConfig, customCommands, engagementSettings, streamInfo, weeklyLeveling, notificationHistory, notificationFilters } = _getState();
  return `
<div class="card">
  <h2>🔔 Notifications</h2>
  <p style="color:#b0b0b0">Manage event notifications, auto-delete rules, and notification history</p>

  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:14px 0 6px;font-weight:600;font-size:14px;color:#9146ff"><input type="checkbox" checked onchange="document.getElementById('notifFiltersSection').style.display=this.checked?'block':'none'" style="accent-color:#9146ff"> 📡 Event Filters</label>
  <div id="notifFiltersSection" style="padding:14px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:8px;margin-bottom:12px">
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="notif-live" style="accent-color:#9146ff"> Stream Live</label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="notif-offline" style="accent-color:#9146ff"> Stream Offline</label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="notif-title" style="accent-color:#9146ff"> Title Changed</label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="notif-game" style="accent-color:#9146ff"> Game Changed</label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="notif-raid" style="accent-color:#9146ff"> Raid Received</label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="notif-clip" style="accent-color:#9146ff"> Clip Created</label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="notif-follow" style="accent-color:#9146ff"> Follower Milestone</label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="notif-viewer" style="accent-color:#9146ff"> Viewer Milestone</label>
    </div>
    <button onclick="saveNotifications()" style="margin-top:10px;font-size:12px;padding:5px 14px">Save Filters</button>
  </div>

  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:12px 0 6px;font-weight:600;font-size:14px;color:#9146ff"><input type="checkbox" onchange="document.getElementById('notifAutoDelSection').style.display=this.checked?'block':'none'" style="accent-color:#9146ff"> 🗑️ Auto-Delete Rules</label>
  <div id="notifAutoDelSection" style="display:none;padding:14px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:8px;margin-bottom:12px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <label style="font-weight:600;font-size:13px;white-space:nowrap">Delete after:</label>
      <input type="number" id="autoDeleteDelay" value="${(engagementSettings.autoDeleteDelay || 60000) / 1000}" min="5" max="3600" style="width:100px">
      <span style="color:#8b8fa3;font-size:12px">seconds (5-3600)</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="autoDeleteTitleChange" ${engagementSettings.autoDeleteTitleChange?'checked':''} style="accent-color:#9146ff"> 📝 Title Change</label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="autoDeleteGameChange" ${engagementSettings.autoDeleteGameChange?'checked':''} style="accent-color:#9146ff"> 🎮 Game Change</label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="autoDeleteVod" ${engagementSettings.autoDeleteVod?'checked':''} style="accent-color:#9146ff"> 📹 VOD Available</label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="autoDeleteRaid" ${engagementSettings.autoDeleteRaid?'checked':''} style="accent-color:#9146ff"> ⚔️ Raid Notification</label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="autoDeleteClip" ${engagementSettings.autoDeleteClip?'checked':''} style="accent-color:#9146ff"> 🎬 Clip Created</label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="autoDeleteFollowerMilestone" ${engagementSettings.autoDeleteFollowerMilestone?'checked':''} style="accent-color:#9146ff"> 👥 Follower Milestone</label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="autoDeleteViewerMilestone" ${engagementSettings.autoDeleteViewerMilestone?'checked':''} style="accent-color:#9146ff"> 👀 Viewer Milestone</label>
    </div>
    <button onclick="saveAutoDeleteSettings()" style="margin-top:10px;font-size:12px;padding:5px 14px">💾 Save Auto-Delete</button>
  </div>

  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:12px 0 6px;font-weight:600;font-size:14px;color:#9146ff"><input type="checkbox" onchange="document.getElementById('notifHistorySection').style.display=this.checked?'block':'none'" style="accent-color:#9146ff"> 📜 History (${notificationHistory.length})</label>
  <div id="notifHistorySection" style="display:none;padding:14px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:8px">
    ${notificationHistory.length === 0 ? '<p style="color:#8b8fa3;text-align:center;margin:0">No notifications yet</p>' : '<div style="max-height:300px;overflow-y:auto"><table style="width:100%;font-size:12px"><tr style="background:#2a2f3a"><th style="padding:6px 8px;text-align:left">Type</th><th style="padding:6px 8px;text-align:left">Message</th><th style="padding:6px 8px;text-align:left">Time</th></tr>' + notificationHistory.slice(-30).reverse().map(n => '<tr style="border-bottom:1px solid #2a2f3a"><td style="padding:5px 8px;font-weight:600;font-size:11px">' + n.type + '</td><td style="padding:5px 8px">' + n.message + '</td><td style="padding:5px 8px;color:#8b8fa3;font-size:11px;white-space:nowrap">' + new Date(n.timestamp).toLocaleString() + '</td></tr>').join('') + '</table></div>'}
  </div>
</div>

<script>
const notifs = ${JSON.stringify(notificationFilters)};
document.querySelectorAll('[id^="notif-"]').forEach(el => {
  const event = el.id.replace('notif-', '');
  el.checked = notifs.includes(event);
});

function saveNotifications() {
  const active = [];
  document.querySelectorAll('[id^="notif-"]').forEach(el => {
    if (el.checked) active.push(el.id.replace('notif-', ''));
  });
  fetch('/notifications/save', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({filters: active})
  }).then(() => alert('Notification preferences saved!'));
}

function saveAutoDeleteSettings() {
  fetch('/api/engagement-settings', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      autoDeleteTitleChange: document.getElementById('autoDeleteTitleChange').checked,
      autoDeleteGameChange: document.getElementById('autoDeleteGameChange').checked,
      autoDeleteVod: document.getElementById('autoDeleteVod').checked,
      autoDeleteRaid: document.getElementById('autoDeleteRaid').checked,
      autoDeleteClip: document.getElementById('autoDeleteClip').checked,
      autoDeleteFollowerMilestone: document.getElementById('autoDeleteFollowerMilestone').checked,
      autoDeleteViewerMilestone: document.getElementById('autoDeleteViewerMilestone').checked,
      autoDeleteDelay: parseInt(document.getElementById('autoDeleteDelay').value) * 1000
    })
  }).then(r=>r.json()).then(data => {
    if (data.success) alert('Auto-delete settings saved!');
    else alert('Failed: ' + (data.error || 'Unknown'));
  });
}
</script>
`;
}

export function renderYouTubeAlertsTab() {
  const { stats, client, commandUsage, dashboardSettings, giveaways, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, startTime, welcomeSettings, xpMultiplier, youtubeAlerts, loadJSON, SCHED_MSG_PATH, DATA_DIR, config, levelingConfig, customCommands, engagementSettings, streamInfo, weeklyLeveling, notificationHistory, notificationFilters } = _getState();
  const ya = normalizeYouTubeAlertsSettings(dashboardSettings.youtubeAlerts || {});
  const guild = client.guilds.cache.first();
  const textChannels = guild ? Array.from(guild.channels.cache.filter(c => c.type === 0 || c.type === 5).values()).map(c => ({ id: c.id, name: c.name, category: c.parent?.name || 'No Category' })).sort((a,b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)) : [];
  const roles = guild ? Array.from(guild.roles.cache.values()).filter(r => !r.managed && r.id !== guild.id).map(r => ({ id: r.id, name: r.name, color: r.hexColor, pos: r.position })).sort((a,b) => b.pos - a.pos) : [];

  const channelOptionsHtml = textChannels.map(c => '<option value="' + c.id + '">' + c.category + ' › #' + c.name + '</option>').join('');
  const roleOptionsHtml = roles.map(r => '<option value="' + r.id + '" style="color:' + r.color + '">' + r.name + '</option>').join('');

  const feedRows = (ya.feeds || []).map(feed => {
    const ch = textChannels.find(c => c.id === feed.alertChannelId);
    const rl = roles.find(r => r.id === feed.alertRoleId);
    const rr = roles.find(r => r.id === feed.rewardRoleId);
    return '<tr style="border-bottom:1px solid #2a2f3a">'
      + '<td style="padding:10px 8px"><strong>' + (feed.name || '-') + '</strong></td>'
      + '<td style="padding:10px 8px"><code style="background:#17171b;padding:2px 6px;border-radius:3px;font-size:11px">' + (feed.youtubeChannelId || '-') + '</code></td>'
      + '<td style="padding:10px 8px">' + (ch ? '<span style="color:#5865f2">#' + ch.name + '</span>' : '<code>' + (feed.alertChannelId || '-') + '</code>') + '</td>'
      + '<td style="padding:10px 8px">' + (rl ? '<span style="color:' + rl.color + '">@' + rl.name + '</span>' : (feed.alertRoleId ? '<code>' + feed.alertRoleId + '</code>' : '<span style="color:#555">None</span>')) + '</td>'
      + '<td style="padding:10px 8px">' + (feed.rewardChance != null ? '<span style="color:#f1c40f">' + feed.rewardChance + '%</span>' : '<span style="color:#555">—</span>') + '</td>'
      + '<td style="padding:10px 8px">' + (feed.lastSuccessAt ? '<span style="color:#2ecc71">' + new Date(feed.lastSuccessAt).toLocaleString() + '</span>' : '<span style="color:#555">Never</span>') + '</td>'
      + '<td style="padding:10px 8px;white-space:nowrap">'
      + '<button class="small" style="width:auto;margin:0 2px" onclick="editYtFeed(\'' + feed.id + '\')">✏️</button>'
      + '<button class="small danger" style="width:auto;margin:0 2px" onclick="removeYtFeed(\'' + feed.id + '\')">🗑️</button>'
      + '</td></tr>';
  }).join('');

  return `
<style>
.yt-section{background:#1f1f23;border:1px solid #2a2f3a;border-radius:8px;padding:20px;margin-bottom:15px}
.yt-section h2{margin:0 0 4px;font-size:18px;display:flex;align-items:center;gap:10px}
.yt-section h2 .yt-badge{font-size:10px;padding:3px 8px;border-radius:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
.yt-section p.sub{color:#8b8fa3;font-size:13px;margin:0 0 16px}
.yt-field{margin-bottom:14px}
.yt-field label{display:block;font-size:11px;font-weight:700;color:#8b8fa3;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px}
.yt-field label .req{color:#e74c3c}
.yt-field select,.yt-field input,.yt-field textarea{width:100%;margin:0;background:#2a2f3a;border:1px solid #3a3a42;font-size:14px;padding:10px;border-radius:4px;color:#e0e0e0;transition:border-color 0.15s;box-sizing:border-box}
.yt-field select:focus,.yt-field input:focus,.yt-field textarea:focus{border-color:#9146ff;outline:none;box-shadow:0 0 0 2px rgba(145,70,255,0.15)}
.yt-field select{cursor:pointer;appearance:auto}
.yt-field small{display:block;margin-top:4px;font-size:11px;color:#555}
.yt-grid{display:grid;gap:14px}
.yt-grid-2{grid-template-columns:1fr 1fr}
.yt-grid-3{grid-template-columns:1fr 1fr 1fr}
.yt-grid-4{grid-template-columns:1fr 1fr 1fr 1fr}
.yt-divider{border:none;border-top:1px solid #2a2f3a;margin:18px 0}
.yt-pill{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:16px;font-size:11px;font-weight:600}
.yt-pill.on{background:#2ecc7120;color:#2ecc71}
.yt-pill.off{background:#e74c3c20;color:#e74c3c}
.yt-btn-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
.yt-btn{padding:10px 20px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all 0.15s;display:inline-flex;align-items:center;gap:6px}
.yt-btn:hover{transform:translateY(-1px);filter:brightness(1.1)}
.yt-btn.primary{background:#9146ff;color:#fff}
.yt-btn.secondary{background:#3a3a42;color:#e0e0e0}
.yt-btn.success{background:#2ecc71;color:#fff}
.yt-btn.warning{background:#f39c12;color:#fff}
.yt-btn.danger{background:#e74c3c;color:#fff}
.yt-toggle{position:relative;display:inline-flex;align-items:center;gap:10px;cursor:pointer}
.yt-toggle input{display:none}
.yt-toggle .slider{width:44px;height:24px;background:#3a3a42;border-radius:12px;position:relative;transition:background 0.2s}
.yt-toggle .slider::after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;background:#666;border-radius:50%;transition:all 0.2s}
.yt-toggle input:checked+.slider{background:#9146ff}
.yt-toggle input:checked+.slider::after{left:23px;background:#fff}
.yt-table{width:100%;border-collapse:separate;border-spacing:0;font-size:12px}
.yt-table thead th{padding:10px 8px;text-align:left;background:#2a2f3a;color:#8b8fa3;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #3a3a42}
.yt-table thead th:first-child{border-radius:6px 0 0 0}
.yt-table thead th:last-child{border-radius:0 6px 0 0}
.yt-table tbody tr{transition:background 0.1s}
.yt-table tbody tr:hover{background:#ffffff06}
.yt-reward-card{background:#2a2f3a;border:1px solid #3a3a42;border-radius:8px;padding:16px;margin-top:12px}
.yt-reward-card h4{margin:0 0 12px;font-size:14px;color:#f1c40f;display:flex;align-items:center;gap:8px}
.yt-range-row{display:flex;align-items:center;gap:8px}
.yt-range-row span{color:#8b8fa3;font-size:12px}
.yt-form-card{background:#1f1f23;border:1px solid #2a2f3a;border-radius:8px;padding:20px;margin-top:16px;position:relative}
.yt-form-card h3{margin:0 0 16px;font-size:16px;color:#fff;display:flex;align-items:center;gap:8px}
.yt-form-card h3 .edit-badge{font-size:10px;background:#f39c1230;color:#f39c12;padding:3px 8px;border-radius:8px;display:none}
.yt-health-bar{display:flex;gap:16px;flex-wrap:wrap}
.yt-health-item{flex:1;min-width:160px;background:#2a2f3a;border:1px solid #3a3a42;border-radius:8px;padding:12px}
.yt-health-item .label{font-size:10px;text-transform:uppercase;color:#8b8fa3;letter-spacing:0.5px;margin-bottom:4px}
.yt-health-item .value{font-size:14px;font-weight:600}
@media(max-width:768px){.yt-grid-2,.yt-grid-3,.yt-grid-4{grid-template-columns:1fr}}
</style>

<div class="yt-section">
  <h2>📺 YouTube Alerts <span class="yt-badge" style="background:${ya.enabled ? '#2ecc7125;color:#2ecc71' : '#e74c3c25;color:#e74c3c'}">${ya.enabled ? 'ACTIVE' : 'DISABLED'}</span></h2>
  <p class="sub">Multi-channel YouTube alerts with per-feed targeting, template variables, and reward chances.</p>
  <label class="yt-toggle">
    <input type="checkbox" id="ytEnabled" ${ya.enabled ? 'checked' : ''} onchange="document.querySelector('.yt-badge').textContent=this.checked?'ACTIVE':'DISABLED';document.querySelector('.yt-badge').style.background=this.checked?'#2ecc7125':'#e74c3c25';document.querySelector('.yt-badge').style.color=this.checked?'#2ecc71':'#e74c3c';saveYouTubeAlerts(true)">
    <span class="slider"></span>
    <span style="font-weight:600">Enable YouTube alerts</span>
  </label>
</div>

<div class="yt-section">
  <h2>⚙️ Global Settings</h2>
  <p class="sub">Shared template and button label across all feeds.</p>
  <div class="yt-grid yt-grid-2">
    <div class="yt-field">
      <label>Message Template</label>
      <textarea id="ytTemplate" style="min-height:90px;resize:vertical;font-family:monospace;font-size:12px">${String(ya.template || '').replace(/</g, '&lt;')}</textarea>
      <small>Variables: <code style="color:#9146ff">{title}</code> <code style="color:#9146ff">{url}</code> <code style="color:#9146ff">{publishedAt}</code> <code style="color:#9146ff">{channelName}</code> <code style="color:#9146ff">{videoId}</code></small>
    </div>
    <div>
      <div class="yt-field">
        <label>Reward Button Label</label>
        <input id="ytRewardButtonLabel" value="${(ya.rewardButtonLabel || '🎁 Claim Reward').replace(/"/g, '&quot;')}">
      </div>
      <div class="yt-field" style="margin-top:8px">
        <label>Template Preview</label>
        <pre id="ytTemplatePreview" style="white-space:pre-wrap;margin:0;background:#2a2f3a;border:1px solid #3a3a42;padding:10px;border-radius:4px;font-size:12px;min-height:60px;color:#b0b0b0"></pre>
      </div>
    </div>
  </div>
  <div class="yt-btn-row">
    <button class="yt-btn secondary" onclick="previewYtTemplate()">👀 Preview</button>
    <button class="yt-btn primary" onclick="saveYouTubeAlerts()">💾 Save All Settings</button>
  </div>
</div>

<div class="yt-section">
  <h2>📡 Feeds <span style="font-size:13px;color:#8b8fa3;font-weight:400">(${(ya.feeds || []).length} configured)</span></h2>
  <p class="sub">Each feed monitors one YouTube channel and posts alerts to a specific Discord channel.</p>
  <div style="overflow-x:auto;border-radius:8px;border:1px solid #2a2f3a">
    <table class="yt-table">
      <thead><tr>
        <th>Name</th><th>YouTube Channel</th><th>Alert Channel</th><th>Ping Role</th><th>Reward %</th><th>Last Success</th><th style="width:80px">Actions</th>
      </tr></thead>
      <tbody id="ytFeedsBody">${feedRows || '<tr><td colspan="7" style="padding:16px;color:#555;text-align:center">No feeds configured yet — add one below</td></tr>'}</tbody>
    </table>
  </div>

  <div class="yt-form-card" id="ytFormCard">
    <h3><span id="ytFormIcon">➕</span> <span id="ytFormTitle">Add New Feed</span> <span class="edit-badge" id="ytEditBadge">EDITING</span></h3>
    <input type="hidden" id="ytFeedId" value="">

    <div style="margin-bottom:16px">
      <div class="yt-grid yt-grid-2">
        <div class="yt-field">
          <label>Feed Name <span class="req">*</span></label>
          <input id="ytFeedName" placeholder="e.g. Main Channel, Clips, etc.">
        </div>
        <div class="yt-field">
          <label>YouTube Channel ID <span class="req">*</span></label>
          <input id="ytFeedChannelId" placeholder="UC... (e.g. UCxxxxxxxxxxxxxxxxxxxxxx)">
          <small>Must start with UC. Find it on the YouTube channel page URL under /channel/UC...</small>
        </div>
      </div>
    </div>

    <div style="margin-bottom:16px">
      <div class="yt-grid yt-grid-2">
        <div class="yt-field">
          <label>Discord Alert Channel <span class="req">*</span></label>
          <select id="ytFeedAlertChannelId">
            <option value="">— Select a channel —</option>
            ${channelOptionsHtml}
          </select>
        </div>
        <div class="yt-field">
          <label>Ping Role <span style="color:#555">(optional)</span></label>
          <select id="ytFeedAlertRoleId">
            <option value="">— No ping —</option>
            ${roleOptionsHtml}
          </select>
        </div>
      </div>
    </div>

    <hr class="yt-divider">

    <div class="yt-reward-card">
      <h4>🎁 Reward Configuration</h4>
      <p style="color:#8b8fa3;font-size:12px;margin:0 0 14px">Configure what viewers can earn when they claim the reward button. Each reward has an independent chance to trigger.</p>

      <div class="yt-grid yt-grid-4" style="margin-bottom:14px">
        <div class="yt-field">
          <label>Reward Chance</label>
          <div style="display:flex;align-items:center;gap:4px">
            <input id="ytFeedRewardChance" type="number" min="0" max="100" step="1" placeholder="100" style="flex:1">
            <span style="color:#8b8fa3;font-weight:700">%</span>
          </div>
          <small>Chance to receive any reward on claim</small>
        </div>
        <div class="yt-field">
          <label>XP Amount</label>
          <div class="yt-range-row">
            <input id="ytFeedRewardXpMin" type="number" min="0" placeholder="Min" style="flex:1">
            <span>—</span>
            <input id="ytFeedRewardXpMax" type="number" min="0" placeholder="Max" style="flex:1">
          </div>
          <small>Random XP between min-max</small>
        </div>
        <div class="yt-field">
          <label>XP Multiplier</label>
          <input id="ytFeedRewardMultiplier" type="number" step="0.1" min="1" max="10" placeholder="1.0">
          <small>Temporary XP boost (e.g. 1.5x)</small>
        </div>
        <div class="yt-field">
          <label>Multiplier Duration</label>
          <div style="display:flex;align-items:center;gap:4px">
            <input id="ytFeedRewardDurationMinutes" type="number" min="1" placeholder="60" style="flex:1">
            <span style="color:#8b8fa3;font-size:11px">min</span>
          </div>
        </div>
      </div>

      <div class="yt-grid yt-grid-3">
        <div class="yt-field">
          <label>Reward Role</label>
          <select id="ytFeedRewardRoleId">
            <option value="">— No role reward —</option>
            ${roleOptionsHtml}
          </select>
          <small>Temporarily granted role</small>
        </div>
        <div class="yt-field">
          <label>Role Duration</label>
          <div style="display:flex;align-items:center;gap:4px">
            <input id="ytFeedRewardRoleDuration" type="number" min="1" placeholder="60" style="flex:1">
            <span style="color:#8b8fa3;font-size:11px">min</span>
          </div>
          <small>0 = permanent</small>
        </div>
        <div class="yt-field">
          <label>Role Chance</label>
          <div style="display:flex;align-items:center;gap:4px">
            <input id="ytFeedRewardRoleChance" type="number" min="0" max="100" step="1" placeholder="100" style="flex:1">
            <span style="color:#8b8fa3;font-weight:700">%</span>
          </div>
          <small>Independent chance for role reward</small>
        </div>
      </div>
    </div>

    <div class="yt-btn-row">
      <button class="yt-btn success" onclick="upsertYtFeed()" id="ytUpsertBtn">➕ Add Feed</button>
      <button class="yt-btn secondary" onclick="clearYtFeedForm()">🧹 Clear</button>
      <button class="yt-btn warning" onclick="testYouTubeAlert()">🧪 Test Alert</button>
      <button class="yt-btn danger" onclick="forcePostLatest()">🚀 Force Post Latest Video</button>
    </div>
  </div>
</div>

<div class="yt-section">
  <h2>💓 Health Monitor</h2>
  <div class="yt-health-bar">
    <div class="yt-health-item">
      <div class="label">Last Check</div>
      <div class="value" style="color:#5865f2">${ya.health?.lastCheckAt ? new Date(ya.health.lastCheckAt).toLocaleString() : 'Never'}</div>
    </div>
    <div class="yt-health-item">
      <div class="label">Last Success</div>
      <div class="value" style="color:#2ecc71">${ya.health?.lastSuccessAt ? new Date(ya.health.lastSuccessAt).toLocaleString() : 'Never'}</div>
    </div>
    <div class="yt-health-item">
      <div class="label">Duration</div>
      <div class="value">${ya.health?.lastDurationMs ?? 'N/A'}<span style="color:#8b8fa3;font-size:11px">ms</span></div>
    </div>
    <div class="yt-health-item">
      <div class="label">Status</div>
      <div class="value" style="color:${ya.health?.lastError ? '#e74c3c' : '#2ecc71'}">${ya.health?.lastError ? '⚠️ Error' : '✅ Healthy'}</div>
      ${ya.health?.lastError ? '<div style="font-size:11px;color:#e74c3c;margin-top:4px;word-break:break-all">' + ya.health.lastError + '</div>' : ''}
    </div>
  </div>
</div>

<script>
var ytState = ${JSON.stringify(ya).replace(/<\//g, '<\\/')};
var ytChannels = ${JSON.stringify(textChannels).replace(/<\//g, '<\\/')};
var ytRoles = ${JSON.stringify(roles).replace(/<\//g, '<\\/')};

function _chName(id) {
  var c = ytChannels.find(function(x){ return x.id === id; });
  return c ? '#' + c.name : id;
}
function _rlName(id) {
  var r = ytRoles.find(function(x){ return x.id === id; });
  return r ? '@' + r.name : id;
}

function renderYtFeeds() {
  var body = document.getElementById('ytFeedsBody');
  if (!body) return;
  var feeds = Array.isArray(ytState.feeds) ? ytState.feeds : [];
  if (feeds.length === 0) {
    body.innerHTML = '<tr><td colspan="7" style="padding:16px;color:#555;text-align:center">No feeds configured yet</td></tr>';
    return;
  }
  body.innerHTML = feeds.map(function(feed){
    var chLabel = _chName(feed.alertChannelId);
    var rlLabel = feed.alertRoleId ? _rlName(feed.alertRoleId) : '<span style="color:#555">None</span>';
    var chance = feed.rewardChance != null ? '<span style="color:#f1c40f">' + feed.rewardChance + '%</span>' : '<span style="color:#555">\\u2014</span>';
    return '<tr style="border-bottom:1px solid #2a2f3a">'
      + '<td style="padding:10px 8px"><strong>' + (feed.name || '') + '</strong></td>'
      + '<td style="padding:10px 8px"><code style="background:#17171b;padding:2px 6px;border-radius:3px;font-size:11px">' + (feed.youtubeChannelId || '-') + '</code></td>'
      + '<td style="padding:10px 8px;color:#5865f2">' + chLabel + '</td>'
      + '<td style="padding:10px 8px">' + rlLabel + '</td>'
      + '<td style="padding:10px 8px">' + chance + '</td>'
      + '<td style="padding:10px 8px">' + (feed.lastSuccessAt ? '<span style="color:#2ecc71">' + new Date(feed.lastSuccessAt).toLocaleString() + '</span>' : '<span style="color:#555">Never</span>') + '</td>'
      + '<td style="padding:10px 8px;white-space:nowrap">'
      + '<button class="small" style="width:auto;margin:0 2px" onclick="editYtFeed(\\\'' + feed.id + '\\\')">\\u270F\\uFE0F</button>'
      + '<button class="small danger" style="width:auto;margin:0 2px" onclick="removeYtFeed(\\\'' + feed.id + '\\\')">\\uD83D\\uDDD1\\uFE0F</button>'
      + '</td></tr>';
  }).join('');
}

function clearYtFeedForm() {
  document.getElementById('ytFeedId').value = '';
  document.getElementById('ytFeedName').value = '';
  document.getElementById('ytFeedChannelId').value = '';
  document.getElementById('ytFeedAlertChannelId').value = '';
  document.getElementById('ytFeedAlertRoleId').value = '';
  document.getElementById('ytFeedRewardChance').value = '';
  document.getElementById('ytFeedRewardXpMin').value = '';
  document.getElementById('ytFeedRewardXpMax').value = '';
  document.getElementById('ytFeedRewardRoleId').value = '';
  document.getElementById('ytFeedRewardRoleDuration').value = '';
  document.getElementById('ytFeedRewardRoleChance').value = '';
  document.getElementById('ytFeedRewardMultiplier').value = '';
  document.getElementById('ytFeedRewardDurationMinutes').value = '';
  document.getElementById('ytFormIcon').textContent = '\\u2795';
  document.getElementById('ytFormTitle').textContent = 'Add New Feed';
  document.getElementById('ytEditBadge').style.display = 'none';
  document.getElementById('ytUpsertBtn').textContent = '\\u2795 Add Feed';
  document.getElementById('ytFormCard').style.borderColor = '#9146ff33';
}

function editYtFeed(id) {
  var feed = (ytState.feeds || []).find(function(f){ return f.id === id; });
  if (!feed) return;
  document.getElementById('ytFeedId').value = feed.id || '';
  document.getElementById('ytFeedName').value = feed.name || '';
  document.getElementById('ytFeedChannelId').value = feed.youtubeChannelId || '';
  document.getElementById('ytFeedAlertChannelId').value = feed.alertChannelId || '';
  document.getElementById('ytFeedAlertRoleId').value = feed.alertRoleId || '';
  document.getElementById('ytFeedRewardChance').value = feed.rewardChance != null ? feed.rewardChance : '';
  document.getElementById('ytFeedRewardXpMin').value = feed.rewardXpMin || feed.rewardXp || '';
  document.getElementById('ytFeedRewardXpMax').value = feed.rewardXpMax || feed.rewardXp || '';
  document.getElementById('ytFeedRewardRoleId').value = feed.rewardRoleId || '';
  document.getElementById('ytFeedRewardRoleDuration').value = feed.rewardRoleDuration || '';
  document.getElementById('ytFeedRewardRoleChance').value = feed.rewardRoleChance != null ? feed.rewardRoleChance : '';
  document.getElementById('ytFeedRewardMultiplier').value = feed.rewardMultiplier || '';
  document.getElementById('ytFeedRewardDurationMinutes').value = feed.rewardDurationMinutes || '';
  document.getElementById('ytFormIcon').textContent = '\\u270F\\uFE0F';
  document.getElementById('ytFormTitle').textContent = 'Edit Feed: ' + (feed.name || id);
  document.getElementById('ytEditBadge').style.display = 'inline';
  document.getElementById('ytUpsertBtn').textContent = '\\uD83D\\uDCBE Update Feed';
  document.getElementById('ytFormCard').style.borderColor = '#f39c1266';
  document.getElementById('ytFormCard').scrollIntoView({behavior:'smooth',block:'center'});
}

function removeYtFeed(id) {
  if (!confirm('Delete this feed?')) return;
  ytState.feeds = (ytState.feeds || []).filter(function(f){ return f.id !== id; });
  if (document.getElementById('ytFeedId').value === id) {
    clearYtFeedForm();
  }
  renderYtFeeds();
  saveYouTubeAlerts(true);
}

function upsertYtFeed() {
  var id = document.getElementById('ytFeedId').value || ('feed_' + Date.now());
  var xpMin = parseInt(document.getElementById('ytFeedRewardXpMin').value || '0', 10) || 0;
  var xpMax = parseInt(document.getElementById('ytFeedRewardXpMax').value || '0', 10) || 0;
  if (xpMax > 0 && xpMax < xpMin) xpMax = xpMin;
  var feed = {
    id: id,
    name: document.getElementById('ytFeedName').value.trim() || ('Feed ' + id.slice(-4)),
    youtubeChannelId: document.getElementById('ytFeedChannelId').value.trim(),
    alertChannelId: document.getElementById('ytFeedAlertChannelId').value,
    alertRoleId: document.getElementById('ytFeedAlertRoleId').value,
    rewardChance: parseInt(document.getElementById('ytFeedRewardChance').value || '100', 10),
    rewardXp: xpMin,
    rewardXpMin: xpMin,
    rewardXpMax: xpMax || xpMin,
    rewardRoleId: document.getElementById('ytFeedRewardRoleId').value,
    rewardRoleDuration: parseInt(document.getElementById('ytFeedRewardRoleDuration').value || '0', 10) || 0,
    rewardRoleChance: parseInt(document.getElementById('ytFeedRewardRoleChance').value || '100', 10),
    rewardMultiplier: parseFloat(document.getElementById('ytFeedRewardMultiplier').value || '1') || 1,
    rewardDurationMinutes: parseInt(document.getElementById('ytFeedRewardDurationMinutes').value || '60', 10) || 60
  };
  if (!feed.youtubeChannelId || !feed.alertChannelId) {
    alert('YouTube Channel ID and Discord Alert Channel are required.');
    return;
  }
  if (!feed.youtubeChannelId.match(/UC[\\w-]{20,}/)) {
    if (!confirm('Warning: YouTube Channel ID should start with "UC" and be 24+ characters (e.g. UCxxxxxxxxxxxxxxxxxxxxxx).\\n\\n"' + feed.youtubeChannelId + '" does not match this format. @handles and custom URLs will not work.\\n\\nSave anyway?')) return;
  }
  ytState.feeds = (ytState.feeds || []).filter(function(f){ return f.id !== id; });
  ytState.feeds.push(feed);
  clearYtFeedForm();
  renderYtFeeds();
  saveYouTubeAlerts(true);
}

function previewYtTemplate() {
  var t = document.getElementById('ytTemplate').value || '';
  var sample = {
    title: 'Sample Video Title',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    publishedAt: new Date().toLocaleString(),
    channelName: 'Sample Channel',
    videoId: 'dQw4w9WgXcQ'
  };
  var text = t.replace(/\\{(title|url|publishedAt|channelName|videoId)\\}/g, function(_, key){
    return sample[key] || '';
  });
  document.getElementById('ytTemplatePreview').textContent = text;
}

function saveYouTubeAlerts(silent) {
  var payload = {
    enabled: document.getElementById('ytEnabled').checked,
    template: document.getElementById('ytTemplate').value,
    rewardButtonLabel: document.getElementById('ytRewardButtonLabel').value,
    feeds: ytState.feeds || []
  };
  fetch('/youtube-alerts/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(function(r){ return r.json(); })
  .then(function(data){
    if (!data.success) {
      alert('Failed to save: ' + (data.error || 'Unknown error'));
      return;
    }
    if (data.settings) {
      ytState = data.settings;
      renderYtFeeds();
    }
    if (!silent) {
      alert('YouTube alert settings saved!');
    }
  })
  .catch(function(err){ alert('Error: ' + err.message); });
}

function testYouTubeAlert() {
  var currentId = document.getElementById('ytFeedId').value || '';
  var feeds = ytState.feeds || [];
  var hasCurrent = feeds.some(function(f){ return f.id === currentId; });
  var id = hasCurrent ? currentId : (feeds[0] && feeds[0].id);
  if (!id) {
    alert('Add at least one feed first.');
    return;
  }
  fetch('/youtube-alerts/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedId: id })
  })
  .then(function(r){ return r.json(); })
  .then(function(data){
    if (!data.success) {
      alert('Test failed: ' + (data.error || 'Unknown error'));
      return;
    }
    alert('Test alert sent!');
  })
  .catch(function(err){ alert('Error: ' + err.message); });
}

function forcePostLatest() {
  var currentId = document.getElementById('ytFeedId').value || '';
  var feeds = ytState.feeds || [];
  var hasCurrent = feeds.some(function(f){ return f.id === currentId; });
  var id = hasCurrent ? currentId : (feeds[0] && feeds[0].id);
  if (!id) {
    alert('Add at least one feed first.');
    return;
  }
  if (!confirm('This will fetch and post the latest video from YouTube as a real alert (not a test). Continue?')) return;
  fetch('/youtube-alerts/force-post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedId: id })
  })
  .then(function(r){ return r.json(); })
  .then(function(data){
    if (!data.success) {
      alert('Failed: ' + (data.error || 'Unknown error'));
      return;
    }
    alert('Posted latest video: ' + (data.video && data.video.title ? data.video.title : 'Success'));
  })
  .catch(function(err){ alert('Error: ' + err.message); });
}

previewYtTemplate();
renderYtFeeds();
</script>
`;
}

// NEW: Custom Commands/Tags tab
export function renderCustomCommandsTab() {
  const { stats, client, commandUsage, dashboardSettings, giveaways, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, startTime, welcomeSettings, xpMultiplier, youtubeAlerts, loadJSON, SCHED_MSG_PATH, DATA_DIR, config, levelingConfig, customCommands, engagementSettings, streamInfo, weeklyLeveling, notificationHistory, notificationFilters } = _getState();
  return `
<div class="card" style="padding:16px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
    <h2 style="margin:0">🏷️ Custom Commands / Tags</h2>
    <span style="font-size:12px;color:#8b8fa3">${customCommands.length} command${customCommands.length!==1?'s':''}</span>
  </div>

  <input type="hidden" id="editingIndex" value="-1">

  <!-- Essential Fields - always visible -->
  <div style="display:grid;grid-template-columns:1fr 2fr;gap:10px;margin-bottom:10px">
    <div>
      <label style="font-size:11px;color:#8b8fa3;display:block;margin-bottom:3px">Command Name(s)</label>
      <input id="cmdName" placeholder="!hello, !hi" style="margin:0">
      <small style="color:#666;font-size:10px">Comma-separated</small>
    </div>
    <div>
      <label style="font-size:11px;color:#8b8fa3;display:block;margin-bottom:3px">Response(s)</label>
      <textarea id="cmdResponse" placeholder="Response text (each line = separate response)" style="min-height:50px;margin:0;resize:vertical"></textarea>
    </div>
  </div>

  <!-- Tick-box: Advanced Options -->
  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:8px 0 4px;font-weight:600;font-size:12px;color:#9146ff">
    <input type="checkbox" onchange="document.getElementById('cmdAdvanced').style.display=this.checked?'block':'none'" style="accent-color:#9146ff"> ⚙️ Advanced Options
  </label>
  <div id="cmdAdvanced" style="display:none;padding:12px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:6px;margin-bottom:8px">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px">
      <div>
        <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Auto-delete after uses</label>
        <input id="cmdAutoDeleteUses" type="number" min="1" placeholder="e.g. 10" style="margin:0">
      </div>
      <div>
        <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Delete reply after (sec)</label>
        <input id="cmdAutoDeleteDelay" type="number" min="1" placeholder="e.g. 30" style="margin:0">
      </div>
      <div>
        <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Cooldown (sec)</label>
        <input id="cmdCooldown" type="number" min="0" placeholder="e.g. 10" style="margin:0">
      </div>
      <div style="display:flex;align-items:center;padding-top:14px">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px">
          <input id="cmdEmbed" type="checkbox" checked> Embed
        </label>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-top:8px">
      <div>
        <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Allowed Roles</label>
        <input id="cmdAllowedRoles" placeholder="Role IDs" style="margin:0">
      </div>
      <div>
        <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Allowed Channels</label>
        <input id="cmdAllowedChannels" placeholder="Channel IDs" style="margin:0">
      </div>
      <div>
        <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Category</label>
        <input id="cmdCategory" placeholder="e.g. Utility" style="margin:0">
      </div>
      <div>
        <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Tags</label>
        <input id="cmdTags" placeholder="tags, comma sep" style="margin:0">
      </div>
    </div>
    <div style="margin-top:8px">
      <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Image URL</label>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="cmdImageUrl" placeholder="https://i.imgur.com/example.png" style="margin:0;flex:1">
        <div id="imageDropZone" style="border:1px dashed #9146ff;border-radius:4px;padding:6px 12px;cursor:pointer;background:#2a2a2e;font-size:11px;color:#8b8fa3;white-space:nowrap" onclick="document.getElementById('imageFileInput').click()">
          📁 Upload
          <input type="file" id="imageFileInput" accept="image/*" style="display:none">
        </div>
      </div>
      <div id="imagePreview" style="margin-top:6px;display:none">
        <img id="previewImg" style="max-width:120px;max-height:80px;border-radius:4px;border:1px solid #9146ff">
      </div>
    </div>
  </div>

  <div style="display:flex;gap:8px;margin-bottom:14px">
    <button id="addCommandBtn" onclick="addCustomCommand()" style="margin:0">Add Command</button>
    <button id="cancelEditBtn" onclick="cancelEdit()" style="display:none;margin:0;background:#6c757d">Cancel</button>
  </div>
</div>

<div class="card" style="padding:16px">
  <h2 style="margin:0 0 10px">📋 Your Commands</h2>
  <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;margin-bottom:10px">
    <input id="cmdSearch" placeholder="Search name, tag, category" style="margin:0;font-size:12px">
    <select id="cmdFilterStatus" style="margin:0;font-size:12px"><option value="">All</option><option value="active">Active</option><option value="paused">Paused</option></select>
    <input id="cmdFilterTag" placeholder="Filter tag" style="margin:0;font-size:12px">
    <select id="cmdSort" style="margin:0;font-size:12px"><option value="name">Name</option><option value="uses">Uses</option></select>
  </div>
  ${customCommands.length === 0 ? '<p style="color:#8b8fa3">No custom commands yet</p>' : '<div style="max-height:500px;overflow-y:auto"><table style="width:100%;font-size:11px;border-collapse:collapse">' +
    '<tr style="background:#2a2f3a;position:sticky;top:0">' +
      '<th style="padding:6px 8px;text-align:left">Command</th>' +
      '<th style="padding:6px 8px;text-align:left">Response</th>' +
      '<th style="padding:6px 8px;text-align:left;width:45px">Uses</th>' +
      '<th style="padding:6px 8px;text-align:left">Info</th>' +
      '<th style="padding:6px 8px;text-align:left;width:170px">Actions</th>' +
    '</tr>' +
    customCommands.map((c,i) => {
      const lines = c.response.split('\\n').filter(l => l.trim());
      let displayText = '';
      if (lines.length <= 1) displayText = (c.response||'').substring(0, 35) + (c.response.length > 35 ? '...' : '');
      else if (lines.length === 2) displayText = lines.map(l => l.substring(0, 25) + (l.length > 25 ? '...' : '')).join('<br>');
      else displayText = lines[0].substring(0, 25) + (lines[0].length > 25 ? '...' : '') + '<br><span style="color:#9146ff;font-size:10px">+' + (lines.length - 1) + ' more</span>';
      const badges = [
        c.imageUrl ? '<span style="color:#57f287;font-size:10px">🖼️</span>' : '',
        c.autoDeleteAfterUses ? '<span style="color:#ffca28;font-size:10px">🧹' + c.autoDeleteAfterUses + '</span>' : '',
        c.cooldownMs ? '<span style="color:#ffca28;font-size:10px">⏳' + Math.round(c.cooldownMs/1000) + 's</span>' : '',
        c.category ? '<span style="color:#9146ff;font-size:10px">' + c.category + '</span>' : '',
        c.paused ? '<span style="color:#e74c3c;font-size:10px">PAUSED</span>' : ''
      ].filter(Boolean).join(' ');
      return '<tr style="border-bottom:1px solid #1f1f23" data-cmd-name="' + c.name + '" data-cmd-status="' + (c.paused?'paused':'active') + '" data-cmd-tags="' + (c.tags||[]).join(',').toLowerCase() + '" data-cmd-category="' + (c.category||'').toLowerCase() + '" data-cmd-uses="' + (c.uses||0) + '">' +
        '<td style="padding:5px 8px;font-weight:600">' + c.name + '</td>' +
        '<td style="padding:5px 8px;font-size:11px;max-width:200px;overflow:hidden">' + displayText + '</td>' +
        '<td style="padding:5px 8px;text-align:center">' + (c.uses||0) + '</td>' +
        '<td style="padding:5px 8px">' + (badges || '-') + '</td>' +
        '<td style="padding:5px 8px"><div style="display:flex;gap:4px;flex-wrap:wrap">' +
          '<button class="small" onclick="showFullResponse(' + i + ')" style="margin:0;padding:2px 6px;font-size:10px">ℹ️</button>' +
          '<button class="small" onclick="previewCommand(' + i + ')" style="margin:0;padding:2px 6px;font-size:10px">👁️</button>' +
          '<button class="small" onclick="copyCommandResponse(' + i + ')" style="margin:0;padding:2px 6px;font-size:10px">📋</button>' +
          '<button class="small" onclick="editCommand(' + i + ')" style="margin:0;padding:2px 6px;font-size:10px">✏️</button>' +
          '<button class="small" onclick="toggleCommand(' + i + ')" style="margin:0;padding:2px 6px;font-size:10px">' + (c.paused?'▶':'⏸') + '</button>' +
          '<button class="small danger" onclick="deleteCommand(' + i + ')" style="margin:0;padding:2px 6px;font-size:10px">✕</button>' +
        '</div></td></tr>';
    }).join('') +
  '</table></div>'}
</div>
`;
}


// NEW: Giveaways tab
export function renderGiveawaysTab() {
  const { stats, client, commandUsage, dashboardSettings, giveaways, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, startTime, welcomeSettings, xpMultiplier, youtubeAlerts, loadJSON, SCHED_MSG_PATH, DATA_DIR, config, levelingConfig, customCommands, engagementSettings, streamInfo, weeklyLeveling, notificationHistory, notificationFilters, membersCache } = _getState();
  const guild = client.guilds.cache.first();
  const textChannels = guild ? Array.from(guild.channels.cache.filter(c => c.type === 0 || c.type === 5).values()).map(c => ({ id: c.id, name: c.name, category: c.parent?.name || 'No Category' })).sort((a,b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)) : [];
  const roles = guild ? Array.from(guild.roles.cache.values()).filter(r => !r.managed && r.id !== guild.id).map(r => ({ id: r.id, name: r.name, color: r.hexColor, pos: r.position })).sort((a,b) => b.pos - a.pos) : [];
  const channelOptionsHtml = textChannels.map(c => '<option value="' + c.id + '">' + c.category + ' › #' + c.name + '</option>').join('');
  const roleOptionsHtml = roles.map(r => '<option value="' + r.id + '" style="color:' + r.color + '">' + r.name + '</option>').join('');
  const discordNames = Object.values(membersCache.members || {}).map(m => ({ username: m.username || '', displayName: m.displayName || '' })).filter(m => m.username && m.username !== 'Unknown');
  const giveawayNamesJSON = safeJsonForHtml(discordNames);
  return `
<div class="card">
  <h2>🎁 Giveaways</h2>
  <p style="color:#b0b0b0">Create and manage channel giveaways</p>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:15px 0">
    <div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:13px">Prize</label><input id="givePrize" placeholder="e.g., $50 Gift Card" style="width:100%"></div>
    <div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:13px">Duration (min)</label><input id="giveDuration" type="number" value="60" style="width:100%"></div>
    <div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:13px">Winners</label><input id="giveWinners" type="number" min="1" value="1" style="width:100%"></div>
  </div>

  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:12px 0 6px;font-weight:600;font-size:13px;color:#9146ff"><input type="checkbox" onchange="document.getElementById('giveAdvanced').style.display=this.checked?'block':'none'" style="accent-color:#9146ff"> ⚙️ Advanced Options</label>
  <div id="giveAdvanced" style="display:none;padding:14px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:8px;margin-bottom:12px">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
      <div><label style="display:block;margin-bottom:4px;font-size:11px;color:#8b8fa3;text-transform:uppercase">Image URL</label><input id="giveImageUrl" placeholder="https://..." style="width:100%"></div>
      <div><label style="display:block;margin-bottom:4px;font-size:11px;color:#8b8fa3;text-transform:uppercase">Embed Color</label><input id="giveEmbedColor" placeholder="${config.giveawayDefaultColor || '#FFD700'}" style="width:100%"></div>
      <div><label style="display:block;margin-bottom:4px;font-size:11px;color:#8b8fa3;text-transform:uppercase">Tag</label><select id="giveTag" style="width:100%"><option value="">None</option><option value="game">Game</option><option value="cash">Cash</option><option value="nitro">Nitro</option><option value="event">Event</option><option value="other">Other</option></select></div>
      <div><label style="display:block;margin-bottom:4px;font-size:11px;color:#8b8fa3;text-transform:uppercase">Channel</label><select id="giveChannel" style="width:100%"><option value="">Default (main channel)</option>${channelOptionsHtml}</select></div>
      <div><label style="display:block;margin-bottom:4px;font-size:11px;color:#8b8fa3;text-transform:uppercase">Ping Role</label><select id="givePingRole" style="width:100%"><option value="">No ping</option>${roleOptionsHtml}</select></div>
      <div><label style="display:block;margin-bottom:4px;font-size:11px;color:#8b8fa3;text-transform:uppercase">Created By</label><div style="position:relative"><input id="giveCreatedBy" placeholder="Start typing..." style="width:100%" oninput="giveawayCreatedByHelper(this)" autocomplete="off"><div id="giveCreatedBySuggestions" style="display:none;position:absolute;left:0;right:0;max-height:120px;overflow-y:auto;background:#2b2d31;border:1px solid #444;border-radius:6px;z-index:10"></div></div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:10px">
      <div><label style="display:block;margin-bottom:4px;font-size:11px;color:#8b8fa3;text-transform:uppercase">Min Account Age (days)</label><input id="giveMinAccountAge" type="number" min="0" placeholder="0" style="width:100%"></div>
      <div><label style="display:block;margin-bottom:4px;font-size:11px;color:#8b8fa3;text-transform:uppercase">Min Level</label><input id="giveMinLevel" type="number" min="0" placeholder="0" style="width:100%"></div>
      <div><label style="display:block;margin-bottom:4px;font-size:11px;color:#8b8fa3;text-transform:uppercase">Min XP</label><input id="giveMinXp" type="number" min="0" placeholder="0" style="width:100%"></div>
    </div>
  </div>

  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:8px 0 6px;font-weight:600;font-size:13px;color:#9146ff"><input type="checkbox" onchange="document.getElementById('giveExclusions').style.display=this.checked?'block':'none'" style="accent-color:#9146ff"> 🚫 Exclusions & Eligibility</label>
  <div id="giveExclusions" style="display:none;padding:14px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:8px;margin-bottom:12px">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div>
        <div style="font-weight:600;font-size:12px;margin-bottom:8px">Bulk Exclusions</div>
        <label style="display:flex;align-items:center;gap:8px;margin:4px 0;cursor:pointer;font-size:12px"><input type="checkbox" id="giveExcludePrevWinners"><span>Exclude previous winners</span></label>
        <label style="display:flex;align-items:center;gap:8px;margin:4px 0;cursor:pointer;font-size:12px"><input type="checkbox" id="giveExcludeBots" checked><span>Exclude bots</span></label>
        <label style="display:block;margin:8px 0 3px;font-size:11px;color:#8b8fa3;text-transform:uppercase">Staff Roles to Exclude</label>
        <select id="giveExcludeStaffRoles" multiple style="width:100%;min-height:60px">${roleOptionsHtml}</select>
        <small style="color:#555;font-size:10px">Hold Ctrl/Cmd to select multiple</small>
      </div>
      <div>
        <div style="font-weight:600;font-size:12px;margin-bottom:8px">Eligible Roles</div>
        <div style="display:flex;gap:6px;margin-bottom:6px"><select id="giveRoleInput" style="flex:1"><option value="">Select a role...</option>${roleOptionsHtml}</select><button class="small" id="giveRoleAddBtn" style="width:auto" data-giveaway-action="add-role">Add</button></div>
        <div id="giveRoleList" style="font-size:11px;color:#8b8fa3">No roles added</div>
      </div>
    </div>
    <div style="margin-top:10px">
      <div style="font-weight:600;font-size:12px;margin-bottom:6px">Excluded Users</div>
      <div style="display:flex;gap:6px;margin-bottom:6px"><div style="position:relative;flex:1;max-width:300px"><input id="giveExcludeInput" placeholder="Start typing a username..." style="width:100%" oninput="giveawayExcludeNameHelper(this)" autocomplete="off"><div id="giveExcludeInputSuggestions" style="display:none;position:absolute;left:0;right:0;max-height:120px;overflow-y:auto;background:#2b2d31;border:1px solid #444;border-radius:6px;z-index:10"></div></div><button class="small" id="giveExcludeAddBtn" style="width:auto" data-giveaway-action="add-exclude">Exclude</button></div>
      <div id="giveExcludeList" style="font-size:11px;color:#8b8fa3">No exclusions</div>
    </div>
  </div>

  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:8px 0 6px;font-weight:600;font-size:13px;color:#9146ff"><input type="checkbox" onchange="document.getElementById('giveSettingsTpl').style.display=this.checked?'block':'none'" style="accent-color:#9146ff"> 💾 Settings & Templates</label>
  <div id="giveSettingsTpl" style="display:none;padding:14px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:8px;margin-bottom:12px">
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;margin-bottom:10px">
      <div><label style="display:block;margin-bottom:4px;font-size:11px;color:#8b8fa3;text-transform:uppercase">Claim Contact</label><input id="giveawayClaimContact" placeholder="Contact @Admin to claim" value="${config.giveawayClaimContact || ''}" style="width:100%"></div>
      <div><label style="display:block;margin-bottom:4px;font-size:11px;color:#8b8fa3;text-transform:uppercase">Default Color</label><input id="giveawayDefaultColor" placeholder="#FFD700" value="${config.giveawayDefaultColor || ''}" style="width:100%"></div>
      <div><label style="display:block;margin-bottom:4px;font-size:11px;color:#8b8fa3;text-transform:uppercase">Log Channel</label><select id="giveawayLogChannelId" style="width:100%"><option value="">None</option>${channelOptionsHtml}</select></div>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="small" style="width:auto" onclick="saveGiveawaySettings()">Save Settings</button></div>
    <div style="border-top:1px solid #2a2f3a;padding-top:10px">
      <div style="font-weight:600;font-size:12px;margin-bottom:8px">Templates</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><input id="giveTemplateName" placeholder="Template name" style="flex:1;min-width:140px"><button class="small" style="width:auto" onclick="saveGiveawayTemplate()">Save</button><select id="giveTemplateSelect" style="flex:1;min-width:140px"><option value="">Select template</option></select><button class="small" style="width:auto" onclick="loadGiveawayTemplate()">Load</button><button class="small danger" style="width:auto" onclick="deleteGiveawayTemplate()">Delete</button></div>
    </div>
  </div>

  <div id="giveMemberPreviewContainer" style="display:none;padding:12px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:8px;margin:10px 0">
    <h4 style="margin:0 0 8px 0;font-size:13px">👥 Eligible Members Preview</h4>
    <input id="giveMemberSearch" placeholder="Search by username..." style="width:100%;margin-bottom:6px">
    <div id="giveMemberPreviewList" style="font-size:11px;color:#8b8fa3;max-height:200px;overflow-y:auto">No members found</div>
  </div>

  <button onclick="startGiveaway()">Start Giveaway</button>
</div>

  <div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
      <h2>📊 Active & Past Giveaways</h2>
      <button class="small" style="width:auto" onclick="exportGiveawayWinners()">Export Winners CSV</button>
    </div>
  ${giveaways.length === 0 ? '<p>No giveaways yet</p>' : `<table style="width:100%;font-size:12px">
    <tr style="background:#2a2f3a">
      <th style="padding:8px">Prize</th>
      <th style="padding:8px">Tag</th>
      <th style="padding:8px">Entries</th>
      <th style="padding:8px">Status</th>
      <th style="padding:8px">Winners</th>
        <th style="padding:8px">Created By</th>
      <th style="padding:8px">Actions</th>
    </tr>
    ${giveaways.map((g,i) => {
      const isActive = !!g.active && g.endTime > Date.now();
      const isArchived = !!g.archived;
      const isPaused = !!g.paused;
      const status = isArchived ? '📦 ARCHIVED' : (isPaused ? '⏸️ PAUSED' : (isActive ? '🟢 ACTIVE' : '🔴 ENDED'));
      const excludedCount = Array.isArray(g.excludedUserIds) ? g.excludedUserIds.length : 0;
      const tagLabel = g.tag ? String(g.tag) : '';
      const entriesCount = Number.isFinite(g.entryCount)
        ? g.entryCount
        : (Array.isArray(g.entries) ? g.entries.length : (Array.isArray(g.participants) ? g.participants.length : 0));
      
      let winnerDisplay = 'TBD';
      if (Array.isArray(g.winners) && g.winners.length > 0) {
        const shown = g.winners.slice(0, 2);
        const more = g.winners.length - shown.length;
        const shownHtml = shown.map(id => `<span data-user-info="${id}">Loading...</span>`).join(', ');
        const moreHtml = more > 0 ? ` <button type="button" class="small" data-giveaway-winners="${g.id}" style="width:auto;background:#2a2f3a;border:1px solid #3a3a42;padding:2px 6px;font-size:10px">+${more}</button>` : '';
        winnerDisplay = `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${shownHtml}${moreHtml}</div>`;
      } else if (g.winner) {
        winnerDisplay = `<span data-user-info="${g.winner}">Loading...</span>`;
      } else if (g.winners) {
        winnerDisplay = String(g.winners);
      }
      
      return `<tr style="border-bottom:1px solid #3a3a42">
        <td style="padding:8px"><b>${g.prize}</b></td>
        <td style="padding:8px">${tagLabel ? `<span style="background:#2a2f3a;border:1px solid #3a3a42;border-radius:12px;padding:2px 8px;font-size:10px">${tagLabel}</span>` : '-'}</td>
        <td style="padding:8px">
          <button type="button" data-giveaway-entries="${g.id}" style="background:#2a2f3a;border:1px solid #3a3a42;color:#e0e0e0;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer">${entriesCount}</button>
        </td>
        <td style="padding:8px">
          ${isActive && !isPaused ? `<span data-giveaway-countdown="${g.endTime}">Ends in ${Math.max(0, g.endTime - Date.now())}ms</span>` : status}
        </td>
        <td style="padding:8px">${winnerDisplay}</td>
        <td style="padding:8px">${g.createdBy || 'Dashboard'}</td>
        <td style="padding:8px;min-width:150px;width:150px">
          <div style="display:flex;gap:4px;align-items:center;flex-wrap:nowrap;white-space:nowrap">
            <button onclick="showGiveawayInfo('${g.id}')" style="background:#3a3f4b;color:#e0e0e0;border:none;padding:3px 6px;border-radius:3px;cursor:pointer;font-size:10px;line-height:1;min-width:22px;display:inline-flex;align-items:center;justify-content:center">ℹ️</button>
            ${isActive ? `<button onclick="endGiveawayNow('${g.id}')" style="background:#ffaa00;color:black;border:none;padding:3px 6px;border-radius:3px;cursor:pointer;font-size:10px;line-height:1;display:inline-flex;align-items:center;justify-content:center">End</button>` : ''}
            ${isActive && !isPaused ? `<button onclick="pauseGiveaway('${g.id}')" style="background:#3a3f4b;color:#e0e0e0;border:none;padding:3px 6px;border-radius:3px;cursor:pointer;font-size:10px;line-height:1;display:inline-flex;align-items:center;justify-content:center">Pause</button>` : ''}
            ${isActive && isPaused ? `<button onclick="resumeGiveaway('${g.id}')" style="background:#57F287;color:black;border:none;padding:3px 6px;border-radius:3px;cursor:pointer;font-size:10px;line-height:1;display:inline-flex;align-items:center;justify-content:center">Resume</button>` : ''}
            ${!isActive ? `<button onclick="rerollGiveaway('${g.id}')" style="background:#5865F2;color:white;border:none;padding:3px 6px;border-radius:3px;cursor:pointer;font-size:10px;line-height:1;display:inline-flex;align-items:center;justify-content:center">Reroll</button>` : ''}
            ${!isActive && Array.isArray(g.winners) && g.winners.length ? `<button onclick="pingGiveawayWinners('${g.id}')" style="background:#57F287;color:black;border:none;padding:3px 6px;border-radius:3px;cursor:pointer;font-size:10px;line-height:1;display:inline-flex;align-items:center;justify-content:center">Ping</button>` : ''}
            <button onclick="duplicateGiveawayPreset('${g.id}')" style="background:#2a2f3a;color:#e0e0e0;border:1px solid #3a3a42;padding:3px 6px;border-radius:3px;cursor:pointer;font-size:10px;line-height:1;display:inline-flex;align-items:center;justify-content:center">Duplicate</button>
            <button onclick="showRemoveExclusionModal('${g.id}')" style="background:#f04747;color:white;border:none;padding:3px 6px;border-radius:3px;cursor:pointer;font-size:10px;line-height:1;display:inline-flex;align-items:center;justify-content:center" title="Remove ${excludedCount}">✕ ${excludedCount}</button>
            <button onclick="archiveGiveaway('${g.id}')" style="background:#3a3f4b;color:#e0e0e0;border:none;padding:3px 6px;border-radius:3px;cursor:pointer;font-size:10px;line-height:1;display:inline-flex;align-items:center;justify-content:center">Archive</button>
            <button onclick="deleteGiveaway('${g.id}')" style="background:#ff4444;color:white;border:none;padding:3px 6px;border-radius:3px;cursor:pointer;font-size:10px;line-height:1;display:inline-flex;align-items:center;justify-content:center">Delete</button>
          </div>
        </td>
      </tr>`;
    }).join('')}
  </table>`}
</div>

<script>
var _giveawayDiscordNames = ${giveawayNamesJSON};
function _giveawayAutoHelper(input, sugDivId) {
  var val = input.value.trim().toLowerCase();
  var sugDiv = document.getElementById(sugDivId);
  if (!val || val.length < 1) { sugDiv.style.display = 'none'; return; }
  var matches = _giveawayDiscordNames.filter(function(m) {
    return (m.username && m.username.toLowerCase().indexOf(val) !== -1) || (m.displayName && m.displayName.toLowerCase().indexOf(val) !== -1);
  });
  if (matches.length === 0) { sugDiv.style.display = 'none'; return; }
  sugDiv.innerHTML = '';
  matches.slice(0, 8).forEach(function(m) {
    var label = m.displayName && m.displayName !== m.username ? m.displayName + ' (' + m.username + ')' : m.username;
    var d = document.createElement('div');
    d.textContent = '\uD83D\uDC64 ' + label;
    d.style.cssText = 'padding:6px 10px;cursor:pointer;font-size:12px;color:#e0e0e0;border-bottom:1px solid #333';
    d.onmouseover = function() { d.style.background = '#3a3d45'; };
    d.onmouseout = function() { d.style.background = ''; };
    d.onclick = function() { input.value = m.username; sugDiv.style.display = 'none'; };
    sugDiv.appendChild(d);
  });
  sugDiv.style.display = 'block';
}
function giveawayCreatedByHelper(input) { _giveawayAutoHelper(input, 'giveCreatedBySuggestions'); }
function giveawayExcludeNameHelper(input) { _giveawayAutoHelper(input, 'giveExcludeInputSuggestions'); }
document.addEventListener('click', function(e) {
  ['giveCreatedBySuggestions', 'giveExcludeInputSuggestions'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el && !el.contains(e.target) && e.target.id !== id.replace('Suggestions','')) el.style.display = 'none';
  });
});
if (document.getElementById('giveawayLogChannelId')) {
  document.getElementById('giveawayLogChannelId').value = '${config.giveawayLogChannelId || ''}';
}
</script>
`;
}

function renderGiveawayRoleList(){
  const el = document.getElementById('giveRoleList');
  if (!el) return;
  if (giveawayRoleIds.length === 0) {
    el.textContent = 'No roles added';
    return;
  }
  el.innerHTML = giveawayRoleIds.map(id => (
    '<div style="display:flex;gap:8px;align-items:center;margin:4px 0">' +
      '<span data-role-info="' + id + '" style="color:#e0e0e0">Loading…</span>' +
      '<span style="color:#666">(' + id + ')</span>' +
      '<button class="small danger" style="padding:4px 6px;font-size:10px" data-giveaway-remove-role="' + id + '">Remove</button>' +
    '</div>'
  )).join('');
  el.querySelectorAll('[data-role-info]').forEach(infoEl => {
    const roleId = infoEl.getAttribute('data-role-info');
    fetch('/role/info/' + roleId)
      .then(r => r.json())
      .then(data => {
        infoEl.textContent = (data && data.name) ? data.name : 'Unknown role';
        if (data && data.hexColor) infoEl.style.color = data.hexColor;
      })
      .catch(() => infoEl.textContent = 'Unknown role');
  });
}

function renderGiveawayExcludeList(){
  const el = document.getElementById('giveExcludeList');
  if (!el) return;
  if (giveawayExcludeIds.length === 0) {
    el.textContent = 'No exclusions';
    return;
  }
  el.innerHTML = giveawayExcludeIds.map(id => (
    '<div style="display:flex;gap:8px;align-items:center;margin:4px 0">' +
      '<span data-user-info="' + id + '" style="color:#e0e0e0">Loading…</span>' +
      '<span style="color:#666">(' + id + ')</span>' +
      '<button class="small danger" style="padding:4px 6px;font-size:10px" data-giveaway-remove-exclude="' + id + '">Remove</button>' +
    '</div>'
  )).join('');
  el.querySelectorAll('[data-user-info]').forEach(infoEl => {
    const userId = infoEl.getAttribute('data-user-info');
    fetch('/discord/user/' + userId)
      .then(r => r.json())
      .then(data => {
        infoEl.textContent = (data && (data.displayName || data.username)) ? (data.displayName || data.username) : 'Unknown user';
      })
      .catch(() => infoEl.textContent = 'Unknown user');
  });
}

function addGiveawayRole(){
  const input = document.getElementById('giveRoleInput');
  const id = input && input.value ? input.value.trim() : '';
  if (!id) return;
  if (!giveawayRoleIds.includes(id)) giveawayRoleIds.push(id);
  input.value = '';
  renderGiveawayRoleList();
}

function removeGiveawayRole(id){
  giveawayRoleIds = giveawayRoleIds.filter(r => r !== id);
  renderGiveawayRoleList();
}

function addGiveawayExclude(){
  const input = document.getElementById('giveExcludeInput');
  const id = input && input.value ? input.value.trim() : '';
  if (!id) return;
  if (!giveawayExcludeIds.includes(id)) giveawayExcludeIds.push(id);
  input.value = '';
  renderGiveawayExcludeList();
}

function removeGiveawayExclude(id){
  giveawayExcludeIds = giveawayExcludeIds.filter(u => u !== id);
  renderGiveawayExcludeList();
}

function resolveGiveChannel() {
  const input = document.getElementById('giveChannel');
  const display = document.getElementById('giveChannelName');
  const channelId = input && input.value ? input.value.trim() : '';
  
  if (!channelId) {
    display.textContent = '';
    return;
  }
  
  display.textContent = 'Loading...';
  fetch('/channel/info/' + channelId)
    .then(r => r.json())
    .then(data => {
      if (data && data.name) {
        display.textContent = '✓ #' + data.name;
        display.style.color = '#57F287';
      } else {
        display.textContent = '✗ Channel not found';
        display.style.color = '#ED4245';
      }
    })
    .catch(() => {
      display.textContent = '✗ Error fetching channel';
      display.style.color = '#ED4245';
    });
}

function resolveGivePingRole() {
  const input = document.getElementById('givePingRole');
  const display = document.getElementById('givePingRoleName');
  const roleId = input && input.value ? input.value.trim() : '';
  
  if (!roleId) {
    display.textContent = '';
    return;
  }
  
  display.textContent = 'Loading...';
  fetch('/role/info/' + roleId)
    .then(r => r.json())
    .then(data => {
      if (data && data.name) {
        display.textContent = '✓ @' + data.name;
        display.style.color = data.hexColor || '#57F287';
      } else {
        display.textContent = '✗ Role not found';
        display.style.color = '#ED4245';
      }
    })
    .catch(() => {
      display.textContent = '✗ Error fetching role';
      display.style.color = '#ED4245';
    });
}

let previewTimeout;

async function loadEligibleMembers() {
  clearTimeout(previewTimeout);
  const container = document.getElementById('giveMemberPreviewContainer');
  const list = document.getElementById('giveMemberPreviewList');

  if (!giveawayRoleIds || giveawayRoleIds.length === 0) {
    container.style.display = 'none';
    return;
  }
  
  container.style.display = 'block';
  list.textContent = 'Loading members...';
  
  // Debounce: wait 300ms before fetching to avoid Discord rate limits
  previewTimeout = setTimeout(async () => {
    try {
      const payload = {
        roleIds: giveawayRoleIds,
        excludeIds: giveawayExcludeIds,
        excludePreviousWinners: !!document.getElementById('giveExcludePrevWinners')?.checked,
        excludeBots: !!document.getElementById('giveExcludeBots')?.checked,
        excludeStaffRoleIds: Array.from(document.getElementById('giveExcludeStaffRoles')?.selectedOptions || []).map(o => o.value),
        minAccountAgeDays: parseInt(document.getElementById('giveMinAccountAge')?.value || '0', 10) || 0,
        minLevel: parseInt(document.getElementById('giveMinLevel')?.value || '0', 10) || 0,
        minXp: parseInt(document.getElementById('giveMinXp')?.value || '0', 10) || 0
      };
      const res = await fetch('/giveaway/preview-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        list.textContent = data && data.error ? data.error : 'Error loading members';
        return;
      }

    if (!data.members || data.members.length === 0) {
      list.textContent = 'No eligible members found';
      return;
    }
    
      // Store all members and render with search
      window.allEligibleMembers = data.members;
      renderMemberPreview(data.members);
    } catch (err) {
      list.textContent = 'Error loading members';
    }
  }, 300);
}

function renderMemberPreview(members) {
  const list = document.getElementById('giveMemberPreviewList');
  const search = (document.getElementById('giveMemberSearch').value || '').toLowerCase();
  
  let filtered = members;
  if (search) {
    filtered = members.filter(m => 
      (m.username && m.username.toLowerCase().includes(search)) ||
      (m.displayName && m.displayName.toLowerCase().includes(search))
    );
  }
  
  if (filtered.length === 0) {
    list.textContent = search ? 'No members match search' : 'No members found';
    return;
  }
  
  const shown = filtered.slice(0, 5);
  list.innerHTML = shown.map(m => (
    '<div style="display:flex;gap:8px;align-items:center;margin:6px 0;padding:6px;background:#1f1f23;border-radius:4px">' +
      '<span style="color:#e0e0e0">' + (m.displayName || m.username || 'Unknown') + '</span>' +
      '<span style="color:#666;font-size:11px">(' + m.id + ')</span>' +
    '</div>'
  )).join('');
  
  if (filtered.length > 5) {
    list.innerHTML += '<small style="color:#666;display:block;margin-top:6px">...and ' + (filtered.length - 5) + ' more</small>';
  }
}

const giveawayEntriesCache = new Map();

function formatCountdown(ms) {
  if (ms <= 0) return 'Ended';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const parts = [];
  if (days) parts.push(days + 'd');
  if (hours || days) parts.push(hours + 'h');
  parts.push(mins + 'm');
  parts.push(secs + 's');
  return 'Ends in ' + parts.join(' ');
}

function initGiveawayCountdowns() {
  const items = document.querySelectorAll('[data-giveaway-countdown]');
  if (!items.length) return;
  const tick = () => {
    items.forEach(el => {
      const endTime = Number(el.getAttribute('data-giveaway-countdown'));
      if (!endTime) return;
      el.textContent = formatCountdown(endTime - Date.now());
    });
  };
  tick();
  setInterval(tick, 1000);
}

function showWinnersModal(winners) {
  const list = winners.map(id => `<div style="margin:6px 0"><span data-user-info="${id}">Loading...</span> <span style="color:#666">(${id})</span></div>`).join('');
  const html = '<div style="background:#23232b;padding:16px;border-radius:8px">'
    + '<h3 style="margin:0 0 8px 0">Winners</h3>'
    + '<div style="max-height:240px;overflow:auto">' + list + '</div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">'
    + '<button type="button" onclick="copyWinnersToClipboard()" style="background:#9146ff;border:1px solid #9146ff;color:white;padding:6px 10px;border-radius:4px;cursor:pointer">Copy</button>'
    + '<button type="button" onclick="closeModal()" style="background:#3a3f4b;color:#e0e0e0;border:none;padding:6px 10px;border-radius:4px;cursor:pointer">Close</button>'
    + '</div></div>';
  window.__giveawayWinnersToCopy = winners;
  showGiveawayModal(html);

  document.querySelectorAll('[data-user-info]').forEach(infoEl => {
    const userId = infoEl.getAttribute('data-user-info');
    fetch('/discord/user/' + userId)
      .then(r => r.json())
      .then(data => {
        infoEl.textContent = (data && (data.displayName || data.username)) ? (data.displayName || data.username) : 'Unknown user';
      })
      .catch(() => infoEl.textContent = 'Unknown user');
  });
}

function copyWinnersToClipboard() {
  const winners = window.__giveawayWinnersToCopy || [];
  if (!winners.length) return;
  const text = winners.map(id => `<@${id}>`).join(', ');
  navigator.clipboard.writeText(text).then(() => alert('Copied winners!'));
}

function fetchGiveawayEntries(giveawayId) {
  const cached = giveawayEntriesCache.get(giveawayId);
  if (cached && (Date.now() - cached.ts) < 30000) {
    return Promise.resolve(cached.data);
  }
  return fetch('/giveaway/entries/' + giveawayId)
    .then(r => r.json())
    .then(data => {
      giveawayEntriesCache.set(giveawayId, { ts: Date.now(), data });
      return data;
    });
}

function showEntriesModal(entries) {
  const list = entries.map(u => `<div style="margin:6px 0"><span>${u.name || 'Unknown'}</span> <span style="color:#666">(${u.id})</span></div>`).join('');
  const html = '<div style="background:#23232b;padding:16px;border-radius:8px">'
    + '<h3 style="margin:0 0 8px 0">Entries</h3>'
    + '<div style="max-height:240px;overflow:auto">' + (list || '<div style="color:#777">No entries</div>') + '</div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">'
    + '<button type="button" onclick="copyEntriesToClipboard()" style="background:#9146ff;border:1px solid #9146ff;color:white;padding:6px 10px;border-radius:4px;cursor:pointer">Copy</button>'
    + '<button type="button" onclick="closeModal()" style="background:#3a3f4b;color:#e0e0e0;border:none;padding:6px 10px;border-radius:4px;cursor:pointer">Close</button>'
    + '</div></div>';
  window.__giveawayEntriesToCopy = entries;
  showGiveawayModal(html);
}

function copyEntriesToClipboard() {
  const entries = window.__giveawayEntriesToCopy || [];
  const text = entries.map(u => `<@${u.id}>`).join(', ');
  navigator.clipboard.writeText(text).then(() => alert('Copied entries!'));
}

function pingGiveawayWinners(id) {
  fetch('/giveaway/ping-winners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  }).then(r => r.json()).then(data => {
    if (data && data.success) alert('Winners pinged!');
    else alert('Error: ' + (data.error || 'Unknown error'));
  });
}

function duplicateGiveawayPreset(id) {
  fetch('/giveaway/info/' + id)
    .then(r => r.json())
    .then(data => {
      if (!data) return;
      document.getElementById('givePrize').value = data.prize || '';
      document.getElementById('giveDuration').value = Math.round((data.duration || 0) / 60000) || 60;
      document.getElementById('giveChannel').value = data.channelId || '';
      document.getElementById('givePingRole').value = data.pingRoleId || '';
      document.getElementById('giveTag').value = data.tag || '';
      document.getElementById('giveExcludePrevWinners').checked = !!data.excludePreviousWinners;
      document.getElementById('giveExcludeBots').checked = data.excludeBots !== false;
      document.getElementById('giveExcludeStaffRoles').value = Array.isArray(data.excludeStaffRoleIds) ? data.excludeStaffRoleIds.join(' ') : '';
      giveawayRoleIds = Array.isArray(data.allowedRoleIds) ? data.allowedRoleIds.slice() : [];
      giveawayExcludeIds = Array.isArray(data.excludedUserIds) ? data.excludedUserIds.slice() : [];
      renderGiveawayRoleList();
      renderGiveawayExcludeList();
      resolveGiveChannel();
      resolveGivePingRole();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function archiveGiveaway(id) {
  if (!confirm('Archive this giveaway?')) return;
  fetch('/giveaway/archive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  }).then(r => r.json()).then(data => {
    if (data && data.success) location.reload();
    else alert('Error: ' + (data.error || 'Unknown error'));
  });
}

function deleteGiveaway(id) {
  if (!confirm('Delete this giveaway permanently?')) return;
  fetch('/giveaway/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  }).then(r => r.json()).then(data => {
    if (data && data.success) location.reload();
    else alert('Error: ' + (data.error || 'Unknown error'));
  });
}

// Client-side event listeners - only run in browser
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    renderGiveawayRoleList();
    renderGiveawayExcludeList();
    initGiveawayCountdowns();
    
    // Resolve winner names in giveaway table
    document.querySelectorAll('[data-user-info]').forEach(infoEl => {
      const userId = infoEl.getAttribute('data-user-info');
      fetch('/discord/user/' + userId)
        .then(r => r.json())
        .then(data => {
          infoEl.textContent = (data && (data.displayName || data.username)) ? (data.displayName || data.username) : 'Unknown user';
        })
        .catch(() => infoEl.textContent = 'Unknown user');
    });
  });

  document.addEventListener('click', (e) => {
    const winnersBtn = e.target.closest('[data-giveaway-winners]');
    if (winnersBtn) {
      e.preventDefault();
      const giveawayId = winnersBtn.getAttribute('data-giveaway-winners');
      fetch('/giveaway/info/' + giveawayId)
        .then(r => r.json())
        .then(data => {
          const winners = Array.isArray(data?.winners) ? data.winners : [];
          showWinnersModal(winners);
        });
      return;
    }

    const entriesBtn = e.target.closest('[data-giveaway-entries]');
    if (entriesBtn) {
      e.preventDefault();
      const giveawayId = entriesBtn.getAttribute('data-giveaway-entries');
      entriesBtn.textContent = '...';
      fetchGiveawayEntries(giveawayId).then(data => {
        if (data && Array.isArray(data.entries)) {
          entriesBtn.textContent = data.entries.length;
          showEntriesModal(data.entries);
        } else {
          entriesBtn.textContent = '0';
        }
      }).catch(() => entriesBtn.textContent = '0');
      return;
    }

    const addRoleBtn = e.target.closest('[data-giveaway-action="add-role"]');
    if (addRoleBtn) {
      e.preventDefault();
      addGiveawayRole();
      loadEligibleMembers();
      return;
    }
    const addExcludeBtn = e.target.closest('[data-giveaway-action="add-exclude"]');
    if (addExcludeBtn) {
      e.preventDefault();
      addGiveawayExclude();
      loadEligibleMembers();
      return;
    }
    const removeRoleBtn = e.target.closest('[data-giveaway-remove-role]');
  if (removeRoleBtn) {
    e.preventDefault();
    removeGiveawayRole(removeRoleBtn.getAttribute('data-giveaway-remove-role'));
    loadEligibleMembers();
    return;
  }
  const removeExcludeBtn = e.target.closest('[data-giveaway-remove-exclude]');
  if (removeExcludeBtn) {
    e.preventDefault();
    removeGiveawayExclude(removeExcludeBtn.getAttribute('data-giveaway-remove-exclude'));
    loadEligibleMembers();
    return;
  }
  });

  let entriesHoverTimer = null;
  document.addEventListener('mouseover', (e) => {
    const entriesBtn = e.target.closest('[data-giveaway-entries]');
    if (!entriesBtn) return;
    const giveawayId = entriesBtn.getAttribute('data-giveaway-entries');
    fetchGiveawayEntries(giveawayId)
      .then(data => {
        if (data && Array.isArray(data.entries)) {
          entriesBtn.textContent = data.entries.length;
        }
      })
      .catch(() => {});

    clearTimeout(entriesHoverTimer);
    entriesHoverTimer = setTimeout(() => {
      fetchGiveawayEntries(giveawayId).then(data => {
        if (data && Array.isArray(data.entries)) {
          showEntriesModal(data.entries);
        }
      });
    }, 400);
  }, true);

  document.addEventListener('mouseout', (e) => {
    const entriesBtn = e.target.closest('[data-giveaway-entries]');
    if (!entriesBtn) return;
    clearTimeout(entriesHoverTimer);
  }, true);

  document.getElementById('giveMemberSearch')?.addEventListener('input', () => {
    if (window.allEligibleMembers) {
      renderMemberPreview(window.allEligibleMembers);
    }
  });
}

function startGiveaway() {
  const prize = document.getElementById('givePrize').value.trim();
  const duration = parseInt(document.getElementById('giveDuration').value);
  const winnersCount = parseInt(document.getElementById('giveWinners')?.value || '1', 10) || 1;
  const channelId = document.getElementById('giveChannel').value.trim();
  const pingRoleId = document.getElementById('givePingRole').value.trim();
  const imageUrl = (document.getElementById('giveImageUrl')?.value || '').trim();
  const embedColor = (document.getElementById('giveEmbedColor')?.value || '').trim();
  const tag = (document.getElementById('giveTag')?.value || '').trim();
  const minAccountAgeDays = parseInt(document.getElementById('giveMinAccountAge')?.value || '0', 10) || 0;
  const minLevel = parseInt(document.getElementById('giveMinLevel')?.value || '0', 10) || 0;
  const minXp = parseInt(document.getElementById('giveMinXp')?.value || '0', 10) || 0;
  const createdBy = (document.getElementById('giveCreatedBy')?.value || '').trim();
  const excludePrevWinners = !!document.getElementById('giveExcludePrevWinners')?.checked;
  const excludeBots = !!document.getElementById('giveExcludeBots')?.checked;
  const excludeStaffRoleIds = Array.from(document.getElementById('giveExcludeStaffRoles')?.selectedOptions || []).map(o => o.value);
  if (!prize || !duration) { alert('Fill all fields'); return; }
  
  fetch('/giveaway/start', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      prize,
      durationMinutes: duration,
      channelId: channelId || null,
      pingRoleId: pingRoleId || null,
      allowedRoleIds: giveawayRoleIds,
      excludedUserIds: giveawayExcludeIds,
      imageUrl: imageUrl || null,
      embedColor: embedColor || null,
      tag: tag || null,
      winnersCount: winnersCount,
      minAccountAgeDays: minAccountAgeDays,
      minLevel: minLevel,
      minXp: minXp,
      createdBy: createdBy || null,
      excludePreviousWinners: excludePrevWinners,
      excludeBots: excludeBots,
      excludeStaffRoleIds: excludeStaffRoleIds
    })
  }).then(r=>r.json()).then(data => {
    if(data.success) { alert('Giveaway started!'); location.reload(); }
  });
}

function endGiveawayNow(id) {
  if (!confirm('End this giveaway now?')) return;
  fetch('/giveaway/end', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({id})
  }).then(r=>r.json()).then(data => {
    if(data.success) { alert('Giveaway ended!'); location.reload(); }
    else { alert('Error: ' + (data.error || 'Unknown error')); }
  });
}

function rerollGiveaway(id) {
  if (!confirm('Reroll winners for this giveaway?')) return;
  fetch('/giveaway/reroll', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({id})
  }).then(r=>r.json()).then(data => {
    if(data.success) { alert('Giveaway rerolled!'); location.reload(); }
    else { alert('Error: ' + (data.error || 'Unknown error')); }
  });
}

function removeGiveawayExclusionPrompt(giveawayId) {
  fetch('/giveaway/info/' + giveawayId)
    .then(r => r.json())
    .then(data => {
      if (!data || !data.excludedUsers || data.excludedUsers.length === 0) {
        alert('No exclusions found for this giveaway');
        return;
      }
      
      let message = 'Excluded users:\\n\\n';
      data.excludedUsers.forEach((user, index) => {
        message += (index + 1) + '. ' + user.name + ' (ID: ' + user.id + ')\\n';
      });
      message += '\\nEnter the User ID to remove:';
      
      const userId = prompt(message);
      if (!userId) return;
      
      fetch('/giveaway/exclusions/remove', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id: giveawayId, userId: userId.trim() })
      }).then(r=>r.json()).then(data => {
        if (data && data.success) {
          location.reload();
        } else {
          alert('Error: ' + (data.error || 'Unknown error'));
        }
      }).catch(() => alert('Error removing exclusion'));
    })
    .catch(() => alert('Error loading giveaway info'));
}

function showRemoveExclusionModal(giveawayId) {
  fetch('/giveaway/info/' + giveawayId)
    .then(r => r.json())
    .then(data => {
      if (!data || !data.excludedUsers || data.excludedUsers.length === 0) {
        alert('No exclusions found');
        return;
      }
      
      let html = '<div style="background:#2f3136;padding:20px;border-radius:8px;max-width:400px">';
      html += '<h3 style="margin-top:0;color:#e0e0e0">Remove Exclusion</h3>';
      html += '<div style="margin:15px 0">';
      
      data.excludedUsers.forEach((user, index) => {
        html += '<button onclick="removeExclusionAction(\'' + giveawayId + '\', \'' + user.id + '\')" style="display:block;width:100%;margin:5px 0;background:#f04747;color:white;border:none;padding:8px;border-radius:4px;cursor:pointer;text-align:left">';
        html += '<span>' + (index + 1) + '. ' + user.name + ' (' + user.id + ')</span>';
        html += '</button>';
      });
      
      html += '</div><button onclick="closeModal()" style="width:100%;background:#3a3f4b;color:#e0e0e0;border:none;padding:8px;border-radius:4px;cursor:pointer;margin-top:10px">Cancel</button>';
      html += '</div>';
      
      showGiveawayModal(html);
    })
    .catch(() => alert('Error loading exclusions'));
}

function removeExclusionAction(giveawayId, userId) {
  fetch('/giveaway/exclusions/remove', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ id: giveawayId, userId: userId })
  }).then(r => r.json()).then(data => {
    if (data && data.success) {
      closeModal();
      location.reload();
    } else {
      alert('Error: ' + (data.error || 'Unknown error'));
    }
  }).catch(() => alert('Error removing exclusion'));
}

function showGiveawayModal(html) {
  let modal = document.getElementById('customModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'customModal';
    document.body.appendChild(modal);
  }
  modal.innerHTML = html;
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10000';
  modal.querySelector('div').style.cssText += ';margin:auto';
}

function closeModal() {
  const modal = document.getElementById('customModal');
  if (modal) modal.remove();
}

function showGiveawayInfo(giveawayId) {
  fetch('/giveaway/info/' + giveawayId)
    .then(r => r.json())
    .then(data => {
      if (!data) { alert('Giveaway not found'); return; }
      let info = 'Prize: ' + data.prize + '\\n';
      info += 'Duration: ' + Math.round(data.duration / 60000) + ' minutes\\n';
      if (data.channelId) info += 'Channel: ' + data.channelId + '\\n';
      if (data.pingRoleId) info += 'Ping Role: ' + data.pingRoleId + '\\n';
      if (data.allowedRoleIds && data.allowedRoleIds.length > 0) {
        info += 'Eligible Roles: ' + data.allowedRoleIds.join(', ') + '\\n';
      }
      if (data.excludedUserIds && data.excludedUserIds.length > 0) {
        info += 'Excluded Users: ' + data.excludedUserIds.join(', ') + '\\n';
      }
      info += 'Active: ' + (data.active ? 'Yes' : 'No') + '\\n';
      info += 'Created: ' + new Date(data.endTime - (data.duration || 0)).toLocaleString();
      alert(info);
    })
    .catch(() => alert('Error loading giveaway info'));
}

// Giveaway variables and functions
var giveawayRoleIds = [];
var giveawayExcludeIds = [];

export function renderPollsTab() {
  const { stats, client, commandUsage, dashboardSettings, giveaways, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, startTime, welcomeSettings, xpMultiplier, youtubeAlerts, loadJSON, SCHED_MSG_PATH, DATA_DIR, config, levelingConfig, customCommands, engagementSettings, streamInfo, weeklyLeveling, notificationHistory, notificationFilters, membersCache } = _getState();
  const guild = client.guilds.cache.first();
  const textChannels = guild ? Array.from(guild.channels.cache.filter(c => c.type === 0 || c.type === 5).values()).map(c => ({ id: c.id, name: c.name, category: c.parent?.name || 'No Category' })).sort((a,b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)) : [];
  const roles = guild ? Array.from(guild.roles.cache.values()).filter(r => !r.managed && r.id !== guild.id).map(r => ({ id: r.id, name: r.name, color: r.hexColor, pos: r.position })).sort((a,b) => b.pos - a.pos) : [];
  const pollChannelOptions = textChannels.map(c => '<option value="' + c.id + '">' + c.category + ' › #' + c.name + '</option>').join('');
  const pollRoleOptions = roles.map(r => '<option value="' + r.id + '" style="color:' + r.color + '">' + r.name + '</option>').join('');
  const pollDiscordNames = Object.values(membersCache.members || {}).map(m => ({ username: m.username || '', displayName: m.displayName || '' })).filter(m => m.username && m.username !== 'Unknown');
  const pollNamesJSON = safeJsonForHtml(pollDiscordNames);
  return `
<div class="card">
  <h2>📊 Polls</h2>
  <p style="color:#b0b0b0">Create quick polls for your community</p>
  
  <div style="margin:12px 0"><label style="display:block;margin-bottom:4px;font-weight:600;font-size:13px">Question</label><input id="pollQuestion" placeholder="What should I play next?" style="width:100%"></div>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin:12px 0">
    <div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:13px">Option 1</label><input id="pollOpt1" placeholder="Option A" style="width:100%"></div>
    <div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:13px">Option 2</label><input id="pollOpt2" placeholder="Option B" style="width:100%"></div>
    <div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:13px">Option 3 <span style="color:#8b8fa3;font-weight:400">(opt)</span></label><input id="pollOpt3" placeholder="Option C" style="width:100%"></div>
    <div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:13px">Option 4 <span style="color:#8b8fa3;font-weight:400">(opt)</span></label><input id="pollOpt4" placeholder="Option D" style="width:100%"></div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:12px 0">
    <div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:13px">Duration (min)</label><input id="pollDuration" type="number" placeholder="No limit" style="width:100%"></div>
    <div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:13px">Post Channel <span style="color:#8b8fa3;font-weight:400">(opt)</span></label><select id="pollChannel" style="width:100%"><option value="">Default (main channel)</option>${pollChannelOptions}</select></div>
    <div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:13px">Ping Role <span style="color:#8b8fa3;font-weight:400">(opt)</span></label><select id="pollPingRole" style="width:100%"><option value="">No ping</option>${pollRoleOptions}</select></div>
  </div>

  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:10px 0 6px;font-weight:600;font-size:13px;color:#9146ff"><input type="checkbox" onchange="document.getElementById('pollExclusionSection').style.display=this.checked?'block':'none'" style="accent-color:#9146ff"> 🚫 Exclusions</label>
  <div id="pollExclusionSection" style="display:none;padding:14px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:8px;margin-bottom:12px">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div><label style="display:block;margin-bottom:4px;font-size:11px;color:#8b8fa3;text-transform:uppercase">Exclude Roles</label><select id="pollExcludeRoles" multiple style="width:100%;min-height:90px">${pollRoleOptions}</select><div style="font-size:10px;color:#666;margin-top:2px">Hold Ctrl/Cmd to select multiple</div></div>
      <div><label style="display:block;margin-bottom:4px;font-size:11px;color:#8b8fa3;text-transform:uppercase">Exclude Users</label><div style="position:relative"><input id="pollExcludeUsersInput" placeholder="Type username..." style="width:100%" oninput="_pollExcludeNameHelper(this)" autocomplete="off"><div id="pollExcludeUsersSuggestions" style="display:none;position:absolute;left:0;right:0;max-height:120px;overflow-y:auto;background:#2b2d31;border:1px solid #444;border-radius:6px;z-index:10"></div></div><div id="pollExcludeUsersTags" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px"></div></div>
    </div>
  </div>

  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:10px 0 6px;font-weight:600;font-size:13px;color:#9146ff"><input type="checkbox" onchange="document.getElementById('pollAdvanced').style.display=this.checked?'block':'none'" style="accent-color:#9146ff"> ⚙️ Advanced Options</label>
  <div id="pollAdvanced" style="display:none;padding:14px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:8px;margin-bottom:12px">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
      <div><label style="display:block;margin-bottom:4px;font-size:11px;color:#8b8fa3;text-transform:uppercase">Embed Color</label><input id="pollEmbedColor" placeholder="#5865F2" style="width:100%"></div>
      <div><label style="display:block;margin-bottom:4px;font-size:11px;color:#8b8fa3;text-transform:uppercase">Image URL</label><input id="pollImageUrl" placeholder="https://..." style="width:100%"></div>
      <div><label style="display:block;margin-bottom:4px;font-size:11px;color:#8b8fa3;text-transform:uppercase">Tag</label><select id="pollTag" style="width:100%"><option value="">None</option><option value="community">Community</option><option value="game">Game</option><option value="event">Event</option><option value="feedback">Feedback</option></select></div>
    </div>
  </div>

  <button onclick="createPoll()">Create Poll</button>
</div>

<div class="card">
  <h2>📈 Poll Results</h2>
  ${polls.length === 0 ? '<p>No polls yet</p>' : `<div style="display:grid;gap:15px">
    ${polls.slice().reverse().map(p => {
      const isActive = p.active;
      const results = p.results || [];
      const total = results.length ? results.reduce((a, b) => a + (b.votes || 0), 0) : ((p.votes || []).reduce((a, b) => a + b, 0));
      const pollIndex = polls.indexOf(p);
      return `
      <div style="background:#2a2f3a;padding:12px;border-radius:4px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div style="font-weight:bold">${p.question}</div>
          <div style="display:flex;gap:8px">
            ${isActive ? `<button onclick="endPollNow('${p.id}')" style="background:#ffaa00;color:black;border:none;padding:4px 8px;border-radius:3px;cursor:pointer;font-size:11px">End Now</button>` : ''}
            <button onclick="deletePoll('${p.id || ''}','${p.messageId || ''}',${pollIndex})" style="background:#ff4444;color:white;border:none;padding:4px 8px;border-radius:3px;cursor:pointer;font-size:11px">Delete</button>
          </div>
        </div>
        ${(results.length ? results : p.options.map((opt, idx) => ({ option: opt, votes: (p.votes?.[idx] || 0) }))).map(r => {
          const pct = total ? Math.round(((r.votes || 0) / total) * 100) : 0;
          return `<div style="margin:5px 0;display:flex;align-items:center;gap:10px">
            <div style="flex:1">${r.option}</div>
            <div style="width:100px;background:#1a1a1d;border-radius:3px;height:20px;position:relative;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:#9146ff"></div>
            </div>
            <div style="width:50px;text-align:right">${pct}%</div>
          </div>`;
        }).join('')}
        <div style="color:#999;font-size:11px;margin-top:8px">
          ${isActive ? (p.endTime ? `Active • Ends: ${new Date(p.endTime).toLocaleString()}` : 'Active • No time limit') : `Ended • Total votes: ${total}`}
          &nbsp;|&nbsp; ID: ${p.id || 'N/A'}
        </div>
      </div>`;
    }).join('')}
  </div>`}
</div>

<script>
function createPoll() {
  const q = document.getElementById('pollQuestion').value.trim();
  const duration = parseInt(document.getElementById('pollDuration').value);
  const opts = [
    document.getElementById('pollOpt1').value.trim(),
    document.getElementById('pollOpt2').value.trim(),
    document.getElementById('pollOpt3').value.trim(),
    document.getElementById('pollOpt4').value.trim()
  ].filter(o => o);
  
  if (!q || opts.length < 2) { alert('Need question + at least 2 options'); return; }
  
  const payload = { question: q, options: opts, durationMinutes: isNaN(duration) ? 0 : duration };
  const ch = document.getElementById('pollChannel').value;
  const pr = document.getElementById('pollPingRole').value;
  const ec = document.getElementById('pollEmbedColor').value.trim();
  const img = document.getElementById('pollImageUrl').value.trim();
  const tag = document.getElementById('pollTag').value;
  if (ch) payload.channelId = ch;
  if (pr) payload.pingRoleId = pr;
  if (ec) payload.embedColor = ec;
  if (img) payload.imageUrl = img;
  if (tag) payload.tag = tag;

  // Exclusions
  const exRolesEl = document.getElementById('pollExcludeRoles');
  if (exRolesEl) {
    const exRoles = Array.from(exRolesEl.selectedOptions).map(o => o.value);
    if (exRoles.length) payload.excludeRoles = exRoles;
  }
  const exUserTags = document.getElementById('pollExcludeUsersTags');
  if (exUserTags) {
    const exUsers = Array.from(exUserTags.querySelectorAll('[data-user]')).map(t => t.getAttribute('data-user'));
    if (exUsers.length) payload.excludeUsers = exUsers;
  }
  
  fetch('/poll/create', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  }).then(r=>r.json()).then(data => {
    if(data.success) { alert('Poll created!'); location.reload(); }
    else { alert('Error: ' + (data.error || 'Unknown')); }
  });
}

function endPollNow(pollId) {
  if (!confirm('End this poll now?')) return;
  fetch('/poll/end', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({pollId})
  }).then(r=>r.json()).then(data => {
    if(data.success) { alert('Poll ended!'); location.reload(); }
    else { alert('Error: ' + (data.error || 'Unknown error')); }
  });
}

function deletePoll(pollId, messageId, pollIndex) {
  if (!confirm('Delete this poll? This will also remove it from Discord.')) return;
  
  fetch('/poll/delete', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({pollId, messageId, pollIndex})
  }).then(r=>r.json()).then(data => {
    if(data.success) { alert('Poll deleted!'); location.reload(); }
    else { alert('Error: ' + (data.error || 'Unknown error')); }
  });
}

// Exclusion user autocomplete
const _pollAllNames = JSON.parse(document.getElementById('pollNamesData')?.textContent || '[]');
function _pollExcludeNameHelper(input) {
  const val = input.value.toLowerCase();
  const box = document.getElementById('pollExcludeUsersSuggestions');
  if (!val) { box.style.display = 'none'; return; }
  const existing = new Set(Array.from(document.getElementById('pollExcludeUsersTags').querySelectorAll('[data-user]')).map(t => t.getAttribute('data-user')));
  const matches = _pollAllNames.filter(m => !existing.has(m.username) && (m.username.toLowerCase().includes(val) || m.displayName.toLowerCase().includes(val))).slice(0, 8);
  if (!matches.length) { box.style.display = 'none'; return; }
  box.innerHTML = matches.map(m => '<div style="padding:6px 10px;cursor:pointer;font-size:12px" onmousedown="_pollAddExcludeUser(\\'' + m.username.replace(/'/g, "\\\\'") + '\\')">' + m.displayName + ' <span style="color:#666">@' + m.username + '</span></div>').join('');
  box.style.display = 'block';
  input.onblur = () => setTimeout(() => box.style.display = 'none', 200);
}
function _pollAddExcludeUser(username) {
  const container = document.getElementById('pollExcludeUsersTags');
  if (container.querySelector('[data-user="' + username + '"]')) return;
  const tag = document.createElement('span');
  tag.setAttribute('data-user', username);
  tag.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:#3a3f4b;border-radius:12px;font-size:11px;color:#e0e0e0';
  tag.innerHTML = '@' + username + ' <span onclick="this.parentElement.remove()" style="cursor:pointer;color:#ff6b6b;font-weight:bold">&times;</span>';
  container.appendChild(tag);
  document.getElementById('pollExcludeUsersInput').value = '';
  document.getElementById('pollExcludeUsersSuggestions').style.display = 'none';
}
</script>
<script type="application/json" id="pollNamesData">${pollNamesJSON}</script>
`;
}

// NEW: Reminders tab
export function renderRemindersTab() {
  const { stats, client, commandUsage, dashboardSettings, giveaways, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, startTime, welcomeSettings, xpMultiplier, youtubeAlerts, loadJSON, SCHED_MSG_PATH, DATA_DIR, config, levelingConfig, customCommands, engagementSettings, streamInfo, weeklyLeveling, notificationHistory, notificationFilters } = _getState();
  const schedData = loadJSON(SCHED_MSG_PATH, { messages: [] });
  const schedMsgs = (schedData.messages || []).slice(-50).reverse();
  let schedHtml = schedMsgs.length === 0 ? '<div style="color:#8b8fa3;padding:12px;text-align:center">No scheduled messages yet.</div>' : '<table style="width:100%;font-size:12px"><thead><tr style="background:#2a2f3a"><th style="padding:6px 8px;text-align:left">Content</th><th style="padding:6px 8px">Channel</th><th style="padding:6px 8px">Send At</th><th style="padding:6px 8px">Status</th><th style="padding:6px 8px">Action</th></tr></thead><tbody>';
  schedMsgs.forEach(m => {
    const d = m.sendAt ? new Date(m.sendAt).toLocaleString() : 'N/A';
    const status = m.sent ? '<span style="color:#2ecc71">✅ Sent</span>' : '<span style="color:#f39c12">⏳ Pending</span>';
    schedHtml += '<tr style="border-bottom:1px solid #2a2f3a"><td style="padding:6px 8px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + ((m.content||'').slice(0,60)) + '</td><td style="padding:6px 8px;text-align:center">' + (m.channelId||'?') + '</td><td style="padding:6px 8px;text-align:center;font-size:11px">' + d + '</td><td style="padding:6px 8px;text-align:center">' + status + '</td><td style="padding:6px 8px;text-align:center">' + (!m.sent ? '<button class="small danger" style="margin:0;font-size:10px;padding:3px 6px" onclick="deleteScheduledMsg(\'' + m.id + '\')">Delete</button>' : '') + '</td></tr>';
  });
  if (schedMsgs.length > 0) schedHtml += '</tbody></table>';
  return `
<div class="card">
  <h2>⏰ Reminders & Scheduling</h2>
  <p style="color:#b0b0b0">Quick reminders and scheduled messages in one place</p>

  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:12px 0 6px;font-weight:600;font-size:14px;color:#9146ff"><input type="checkbox" checked onchange="document.getElementById('remQuickSection').style.display=this.checked?'block':'none'" style="accent-color:#9146ff"> ⏰ Quick Reminder</label>
  <div id="remQuickSection" style="padding:14px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:8px;margin-bottom:14px">
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:10px;align-items:end">
      <div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:13px">Message</label><input id="remText" placeholder="e.g., Check stream analytics" style="width:100%"></div>
      <div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:13px">Custom minutes</label><input id="remMinutes" type="number" min="1" max="525600" placeholder="30" style="width:100%"></div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">
      <button class="small" onclick="setReminderTime(5)" style="font-size:11px;padding:4px 10px">5 min</button>
      <button class="small" onclick="setReminderTime(15)" style="font-size:11px;padding:4px 10px">15 min</button>
      <button class="small" onclick="setReminderTime(30)" style="font-size:11px;padding:4px 10px">30 min</button>
      <button class="small" onclick="setReminderTime(60)" style="font-size:11px;padding:4px 10px">1 hr</button>
      <button class="small" onclick="setReminderTime(120)" style="font-size:11px;padding:4px 10px">2 hr</button>
      <button class="small" onclick="setReminderTime(1440)" style="font-size:11px;padding:4px 10px">1 day</button>
      <button onclick="addReminder()" style="margin-left:auto;font-size:12px;padding:4px 14px">Add Reminder</button>
    </div>
  </div>

  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:12px 0 6px;font-weight:600;font-size:14px;color:#9146ff"><input type="checkbox" onchange="document.getElementById('schedCreateSection').style.display=this.checked?'block':'none'" style="accent-color:#9146ff"> 📅 Schedule a Message</label>
  <div id="schedCreateSection" style="display:none;padding:14px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:8px;margin-bottom:14px">
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;align-items:end">
      <div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:13px">Message</label><input id="schedContent" placeholder="Your message..." style="width:100%"></div>
      <div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:13px">Channel ID</label><input id="schedChannel" placeholder="Channel ID" style="width:100%"></div>
      <div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:13px">Send At</label><input id="schedTime" type="datetime-local" style="width:100%"></div>
    </div>
    <button onclick="createScheduledMsg()" style="margin-top:10px;font-size:12px;padding:4px 14px">📅 Schedule</button>
  </div>
</div>

<div class="card">
  <div style="display:flex;gap:12px;border-bottom:2px solid #3a3a42;padding-bottom:8px;margin-bottom:12px">
    <button class="small" id="remSubReminders" onclick="showRemSub('reminders')" style="background:#9146ff;color:white;font-size:12px">⏰ Active Reminders (${reminders.filter(r=>r.active).length})</button>
    <button class="small" id="remSubScheduled" onclick="showRemSub('scheduled')" style="background:#2a2f3a;color:white;font-size:12px">📅 Scheduled Msgs (${schedMsgs.filter(m=>!m.sent).length})</button>
  </div>

  <div id="remSubContent_reminders">
    ${reminders.length === 0 ? '<p style="color:#8b8fa3;text-align:center">No reminders set</p>' : '<table style="width:100%;font-size:12px"><tr style="background:#2a2f3a"><th style="padding:6px 8px;text-align:left">Message</th><th style="padding:6px 8px">Fires At</th><th style="padding:6px 8px">Status</th><th style="padding:6px 8px">Action</th></tr>' + reminders.map((r,i) => {
      const status = r.active ? '⏳ Pending' : '✅ Sent';
      const timeStr = r.reminderTime ? new Date(r.reminderTime).toLocaleString() : 'N/A';
      const msg = r.message || r.text || 'No message';
      const timeLeft = r.active && r.reminderTime ? Math.max(0, Math.floor((r.reminderTime - Date.now()) / 60000)) + ' min' : '';
      return '<tr style="border-bottom:1px solid #2a2f3a"><td style="padding:6px 8px">' + msg + '</td><td style="padding:6px 8px;text-align:center;font-size:11px">' + timeStr + (timeLeft ? ' (' + timeLeft + ')' : '') + '</td><td style="padding:6px 8px;text-align:center">' + status + '</td><td style="padding:6px 8px;text-align:center"><button class="small danger" style="margin:0;font-size:10px;padding:3px 6px" onclick="deleteReminder(' + i + ')">Delete</button></td></tr>';
    }).join('') + '</table>'}
  </div>

  <div id="remSubContent_scheduled" style="display:none">
    ${schedHtml}
  </div>
</div>

<script>
let selectedMinutes = null;

function showRemSub(which) {
  document.getElementById('remSubContent_reminders').style.display = which === 'reminders' ? '' : 'none';
  document.getElementById('remSubContent_scheduled').style.display = which === 'scheduled' ? '' : 'none';
  document.getElementById('remSubReminders').style.background = which === 'reminders' ? '#9146ff' : '#2a2f3a';
  document.getElementById('remSubScheduled').style.background = which === 'scheduled' ? '#9146ff' : '#2a2f3a';
}

function setReminderTime(minutes) {
  selectedMinutes = minutes;
  document.getElementById('remMinutes').value = minutes;
  event.target.style.background = '#a955ff';
}

function addReminder() {
  const text = document.getElementById('remText').value.trim();
  const minutes = parseInt(document.getElementById('remMinutes').value) || selectedMinutes;
  if (!text) { alert('Please enter a reminder message'); return; }
  if (!minutes || minutes < 1) { alert('Please select or enter a time'); return; }
  fetch('/reminder/add', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({text, time: minutes})
  }).then(r=>r.json()).then(data => {
    if(data.success) { alert('Reminder set for ' + minutes + ' minutes!'); location.reload(); }
    else { alert(data.error || 'Failed'); }
  });
}

function deleteReminder(id) {
  if(!confirm('Delete this reminder?')) return;
  fetch('/reminder/delete', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({id})
  }).then(r=>r.json()).then(data => { if(data.success) location.reload(); });
}

function createScheduledMsg() {
  var c = document.getElementById('schedContent').value.trim();
  var ch = document.getElementById('schedChannel').value.trim();
  var t = document.getElementById('schedTime').value;
  if (!c || !ch || !t) { alert('Fill all fields'); return; }
  fetch('/api/scheduled-messages/create', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({content: c, channelId: ch, sendAt: new Date(t).getTime()})
  }).then(r=>r.json()).then(d => {
    if (d.success) { alert('Scheduled!'); location.reload(); }
    else { alert(d.error || 'Error'); }
  });
}

function deleteScheduledMsg(id) {
  if (!confirm('Delete?')) return;
  fetch('/api/scheduled-messages/delete', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({id: id})
  }).then(r=>r.json()).then(d => {
    if (d.success) location.reload();
    else alert(d.error || 'Error');
  });
}
</script>
`;
}

// NEW: Embeds tab
export function renderEmbedsTab() {
  const { stats, client, commandUsage, dashboardSettings, giveaways, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, startTime, welcomeSettings, xpMultiplier, youtubeAlerts, loadJSON, SCHED_MSG_PATH, DATA_DIR, config, levelingConfig, customCommands, engagementSettings, streamInfo, weeklyLeveling, notificationHistory, notificationFilters } = _getState();
  return `
<div class="card">
  <h2>🧱 Embed Builder</h2>
  <p style="color:#b0b0b0">Compose and preview a rich embed, then post it to Discord.</p>

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:15px;margin:15px 0">
    <div>
      <label style="display:block;margin-bottom:5px;font-weight:500">Title</label>
      <input id="embTitle" placeholder="Title">
    </div>
    <div>
      <label style="display:block;margin-bottom:5px;font-weight:500">Color (hex)</label>
      <input id="embColor" placeholder="#5865F2">
    </div>
    <div>
      <label style="display:block;margin-bottom:5px;font-weight:500">Channel ID (optional)</label>
      <input id="embChannel" placeholder="Defaults to DISCORD_CHANNEL_ID">
    </div>
  </div>

  <div style="margin:15px 0">
    <label style="display:block;margin-bottom:5px;font-weight:500">Description</label>
    <textarea id="embDesc" placeholder="Main description"></textarea>
  </div>

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:15px;margin:15px 0">
    <div>
      <label style="display:block;margin-bottom:5px;font-weight:500">Footer</label>
      <input id="embFooter" placeholder="Footer text">
    </div>
    <div>
      <label style="display:block;margin-bottom:5px;font-weight:500">Thumbnail URL</label>
      <input id="embThumb" placeholder="https://...">
    </div>
    <div>
      <label style="display:block;margin-bottom:5px;font-weight:500">Image URL</label>
      <input id="embImage" placeholder="https://...">
    </div>
    <div style="display:flex;align-items:flex-end">
      <label style="display:flex;align-items:center;gap:6px;background:#1f1f23;border:1px solid #3a3a42;border-radius:6px;padding:6px 10px"><input id="embTimestamp" type="checkbox" style="margin:0;width:auto"> Add timestamp</label>
    </div>
  </div>

  <div class="card" style="background:#2a2f3a">
    <h3 style="margin-top:0">Fields</h3>
    <div id="fieldsList"></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">
      <input id="fieldName" placeholder="Field name" style="background:#1f1f23;border:1px solid #3a3a42">
      <input id="fieldValue" placeholder="Field value" style="background:#1f1f23;border:1px solid #3a3a42">
      <label style="display:flex;align-items:center;gap:6px;background:#1f1f23;border:1px solid #3a3a42;border-radius:6px;padding:6px 10px"><input id="fieldInline" type="checkbox" style="margin:0;width:auto"> Inline</label>
      <button class="small" onclick="addField()">Add Field</button>
    </div>
  </div>

  <div class="card" style="background:#2a2f3a">
    <h3 style="margin-top:0">Preview</h3>
    <div id="embedPreview" style="background:#1f1f23;border:1px solid #3a3a42;border-radius:6px;padding:12px">Fill fields to see preview.</div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">
    <button onclick="updatePreview()">Update Preview</button>
    <button onclick="sendEmbed()">Post Embed</button>
    <button class="danger" onclick="resetEmbed()">Reset Embed</button>
  </div>
</div>

<script>
var embFields = [];

function resetEmbed(){
  embFields = [];
  const ids = ['embTitle','embColor','embChannel','embDesc','embFooter','embThumb','embImage','fieldName','fieldValue'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const inline = document.getElementById('fieldInline');
  if (inline) inline.checked = false;
  const ts = document.getElementById('embTimestamp');
  if (ts) ts.checked = false;
  const preview = document.getElementById('embedPreview');
  if (preview) preview.innerHTML = 'Fill fields to see preview.';
  renderFields();
}

function escHtml(s){
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderFields(){
  var el = document.getElementById('fieldsList');
  if(!el) return;
  if(embFields.length === 0){
    el.innerHTML = '<p style="color:#b0b0b0">No fields yet</p>';
    return;
  }
  var html = '';
  for(var i=0;i<embFields.length;i++){
    var f = embFields[i];
    html += '<div style="display:flex;justify-content:space-between;align-items:center;background:#1f1f23;border:1px solid #3a3a42;border-radius:4px;padding:8px;margin:6px 0">'
      + '<div>'
      + '<div style="font-weight:bold">' + escHtml(f.name) + '</div>'
      + '<div style="color:#b0b0b0;font-size:12px">' + escHtml(f.value) + '</div>'
      + '</div>'
      + '<div style="display:flex;gap:8px;align-items:center">'
      + '<span style="font-size:11px;color:#999">' + (f.inline ? 'inline' : 'block') + '</span>'
      + '<button class="small danger" onclick="removeField(' + i + ')">Remove</button>'
      + '</div>'
      + '</div>';
  }
  el.innerHTML = html;
}

function addField(){
  var name = document.getElementById('fieldName').value.trim();
  var value = document.getElementById('fieldValue').value.trim();
  var inline = !!document.getElementById('fieldInline').checked;
  if(!name || !value){ alert('Enter field name and value'); return; }
  embFields.push({ name: name, value: value, inline: inline });
  document.getElementById('fieldName').value='';
  document.getElementById('fieldValue').value='';
  document.getElementById('fieldInline').checked=false;
  renderFields();
  updatePreview();
}

function removeField(i){ embFields.splice(i,1); renderFields(); updatePreview(); }

function updatePreview(){
  var title = document.getElementById('embTitle').value.trim();
  var desc = document.getElementById('embDesc').value.trim();
  var footer = document.getElementById('embFooter').value.trim();
  var image = document.getElementById('embImage').value.trim();
  var ts = !!document.getElementById('embTimestamp').checked;
  var out = '';
  if(title) out += '<div style="font-weight:bold;color:#fff;font-size:16px">' + escHtml(title) + '</div>';
  if(desc) out += '<div style="margin:8px 0">' + escHtml(desc).replace(/\\n/g,'<br>') + '</div>';
  if(embFields.length){
    for(var i=0;i<embFields.length;i++){
      var f = embFields[i];
      out += '<div style="margin:6px 0"><div style="font-weight:bold">' + escHtml(f.name) + '</div><div>' + escHtml(f.value) + '</div></div>';
    }
  }
  if(image) out += '<div style="margin-top:8px"><img src="' + escHtml(image) + '" style="max-width:100%" /></div>';
  if(footer || ts) out += '<div style="margin-top:8px;color:#999;font-size:12px">' + escHtml(footer || '') + (ts ? ' • timestamp' : '') + '</div>';
  document.getElementById('embedPreview').innerHTML = out || 'Fill fields to see preview.';
}

function sendEmbed(){
  var payload = {
    title: document.getElementById('embTitle').value.trim(),
    description: document.getElementById('embDesc').value.trim(),
    color: document.getElementById('embColor').value.trim(),
    footer: document.getElementById('embFooter').value.trim(),
    thumbnail: document.getElementById('embThumb').value.trim(),
    image: document.getElementById('embImage').value.trim(),
    timestamp: !!document.getElementById('embTimestamp').checked,
    fields: embFields,
    channelId: document.getElementById('embChannel').value.trim() || null
  };

  fetch('/embed/send', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  }).then(function(r){ return r.json(); }).then(function(data){
    if(data.success){ alert('Embed posted!'); }
    else { alert('Error: ' + (data.error || 'Unknown error')); }
  });
}

renderFields();
updatePreview();
</script>
`;
}

// NEW: Welcome tab
export function renderWelcomeTab() {
  const { stats, client, commandUsage, dashboardSettings, giveaways, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, startTime, welcomeSettings, xpMultiplier, youtubeAlerts, loadJSON, SCHED_MSG_PATH, DATA_DIR, config, levelingConfig, customCommands, engagementSettings, streamInfo, weeklyLeveling, notificationHistory, notificationFilters } = _getState();
  const ws = dashboardSettings.welcomeSettings || {
    enabled: false,
    channelId: '',
    message: 'Welcome {user} to the server!',
    autoRoles: [],
    useEmbed: false,
    embedTitle: 'Welcome to {server}! 👋',
    embedDescription: 'Hey {user}, welcome to **{server}**! We now have **{count}** members!',
    embedColor: '#9146ff',
    embedThumbnail: 'avatar',
    embedThumbnailUrl: '',
    embedImage: '',
    embedFooter: 'Member #{position} • Joined {time}',
    embedFields: [],
    messages: [],
    messageMode: 'single',
    dmEnabled: false,
    dmMessage: '',
    dmUseEmbed: false,
    antiSpamEnabled: false,
    antiSpamRoles: [],
    goodbyeEnabled: false,
    goodbyeChannelId: '',
    goodbyeMessage: 'Goodbye {username}, we\'ll miss you! 👋',
    goodbyeUseEmbed: false,
    goodbyeEmbedTitle: 'Goodbye! 👋',
    goodbyeEmbedDescription: '{username} has left us. We now have **{count}** members.',
    goodbyeEmbedColor: '#E74C3C',
    goodbyeEmbedThumbnail: 'avatar',
    goodbyeEmbedThumbnailUrl: '',
    goodbyeEmbedImage: '',
    goodbyeEmbedFooter: 'We\'ll miss you!',
    goodbyeMessages: [],
    goodbyeMessageMode: 'single',
    autoRoleConditions: []
  };

  return `
<!-- Variables Reference Card -->
<div class="card" style="background:linear-gradient(135deg,#1f1f23 0%,#2a2f3a 100%);border-left:4px solid #9146ff">
  <h2>📝 Available Variables</h2>
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
    <code style="background:#1a1a1d;padding:4px 8px;border-radius:4px;font-size:12px">{user}</code>
    <code style="background:#1a1a1d;padding:4px 8px;border-radius:4px;font-size:12px">{username}</code>
    <code style="background:#1a1a1d;padding:4px 8px;border-radius:4px;font-size:12px">{server}</code>
    <code style="background:#1a1a1d;padding:4px 8px;border-radius:4px;font-size:12px">{count}</code>
    <code style="background:#1a1a1d;padding:4px 8px;border-radius:4px;font-size:12px">{position}</code>
    <code style="background:#1a1a1d;padding:4px 8px;border-radius:4px;font-size:12px">{time}</code>
    <code style="background:#1a1a1d;padding:4px 8px;border-radius:4px;font-size:12px">{avatar}</code>
    <code style="background:#1a1a1d;padding:4px 8px;border-radius:4px;font-size:12px">{mention}</code>
  </div>
  <p style="color:#888;font-size:12px;margin-top:8px">{user} = mention, {username} = name, {count} = total members, {position} = join #, {time} = join time, {avatar} = avatar URL</p>
</div>

<!-- Welcome Messages Card -->
<div class="card">
  <h2>👋 Welcome Messages</h2>
  <p style="color:#b0b0b0">Configure automatic welcome messages for new members with embeds, rotation, and DM options.</p>

  <div style="margin-top:16px">
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:12px">
      <input type="checkbox" id="welcomeEnabled" ${ws.enabled ? 'checked' : ''}>
      <span style="font-weight:600;color:#fff">Enable Welcome Messages</span>
    </label>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div>
        <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Channel</label>
        <select id="welcomeChannelId" style="margin:0">
          <option value="">-- Select channel --</option>
          ${ws.channelId ? '<option value="' + ws.channelId + '" selected>#' + ws.channelId + ' (loading...)</option>' : ''}
        </select>
      </div>
      <div>
        <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Message Mode</label>
        <select id="messageMode" style="margin:0">
          <option value="single" ${ws.messageMode==='single'?'selected':''}>Single Message</option>
          <option value="rotation" ${ws.messageMode==='rotation'?'selected':''}>Rotation</option>
          <option value="random" ${ws.messageMode==='random'?'selected':''}>Random</option>
        </select>
      </div>
    </div>

    <div>
      <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Welcome Message</label>
      <textarea id="welcomeMessage" placeholder="Welcome {user} to {server}!" style="min-height:60px;margin:0">${ws.message || 'Welcome {user} to the server!'}</textarea>
    </div>

    <div style="margin-top:12px;padding:16px;background:#1a1a1d;border-radius:6px;border:1px solid #2a2f3a">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="useEmbed" ${ws.useEmbed ? 'checked' : ''} onchange="document.getElementById('welcomeEmbedConfig').style.display=this.checked?'block':'none'">
        <span style="font-weight:600;color:#fff">Use Embed</span>
        <span style="font-size:11px;color:#8b8fa3;margin-left:auto">${ws.useEmbed ? '▼ Click to collapse' : '► Tick to configure'}</span>
      </label>
      <div id="welcomeEmbedConfig" style="display:${ws.useEmbed ? 'block' : 'none'};margin-top:12px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Embed Title</label>
          <input type="text" id="embedTitle" value="${(ws.embedTitle||'').replace(/"/g,'&quot;')}" style="margin:0">
        </div>
        <div>
          <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Embed Color</label>
          <input type="text" id="embedColorHex" value="${ws.embedColor || '#9146ff'}" placeholder="#9146ff" style="margin:0">
        </div>
      </div>
      <div style="margin-top:8px">
        <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Embed Description</label>
        <textarea id="embedDescription" style="min-height:60px;margin:0">${(ws.embedDescription||'').replace(/</g,'&lt;')}</textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px">
        <div>
          <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Thumbnail</label>
          <select id="embedThumbnail" style="margin:0">
            <option value="avatar" ${ws.embedThumbnail==='avatar'?'selected':''}>User Avatar</option>
            <option value="custom" ${ws.embedThumbnail==='custom'?'selected':''}>Custom URL</option>
            <option value="none" ${ws.embedThumbnail==='none'?'selected':''}>None</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Thumbnail URL (if custom)</label>
          <input type="text" id="embedThumbnailUrl" value="${ws.embedThumbnailUrl || ''}" style="margin:0">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px">
        <div>
          <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Image URL</label>
          <input type="text" id="embedImage" value="${ws.embedImage || ''}" style="margin:0">
        </div>
        <div>
          <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Footer</label>
          <input type="text" id="embedFooter" value="${(ws.embedFooter||'').replace(/"/g,'&quot;')}" style="margin:0">
        </div>
      </div>
      <div style="margin-top:12px">
        <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Embed Fields</label>
        <div id="embedFieldsContainer">
          ${(ws.embedFields||[]).map(f => 
          '<div class="embed-field-row" style="display:flex;gap:8px;margin-bottom:8px;align-items:center;background:#0e0e10;padding:8px;border-radius:4px">' +
            '<input class="embed-field-name" placeholder="Field Name" value="' + (f.name||'').replace(/"/g,'&quot;') + '" style="flex:1;margin:0">' +
            '<input class="embed-field-value" placeholder="Field Value" value="' + (f.value||'').replace(/"/g,'&quot;') + '" style="flex:2;margin:0">' +
            '<label style="display:flex;align-items:center;gap:4px;white-space:nowrap"><input type="checkbox" class="embed-field-inline" ' + (f.inline?'checked':'') + '><span style="font-size:12px">Inline</span></label>' +
            '<button class="small danger" type="button" onclick="removeEmbedField(this)">✕</button>' +
          '</div>'
          ).join('')}
        </div>
        <button class="small" type="button" onclick="addEmbedField()" style="margin-top:4px">+ Add Field</button>
      </div>
      </div>
    </div>

    <div id="messagesContainer" style="margin-top:12px">
      ${(ws.messages||[]).map((m,i) => 
      '<div class="rotation-message-row" style="background:#1b1d20;padding:12px;border-radius:6px;margin-bottom:8px;border-left:3px solid #9146ff">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<span style="font-weight:500">Message ' + (i+1) + '</span>' +
          '<button class="small danger" type="button" onclick="removeRotationMessage(this)">Remove</button>' +
        '</div>' +
        '<textarea class="rotation-message-text" style="width:100%;min-height:60px;resize:vertical;margin:0">' + (m.text||'') + '</textarea>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">' +
          '<div><label style="font-size:11px;color:#8b8fa3">Weight (rarity)</label><input type="number" class="rotation-message-weight" min="1" max="100" value="' + (m.weight||1) + '" style="margin:0;font-size:12px" title="Higher = more likely. Default 1"></div>' +
          '<div><label style="font-size:11px;color:#8b8fa3">Role filter (optional)</label><select class="rotation-message-role" style="margin:0;font-size:12px"><option value="">Any role</option></select></div>' +
        '</div>' +
      '</div>'
      ).join('')}
    </div>

    <div style="margin-top:16px;padding:16px;background:#1a1a1d;border-radius:6px;border:1px solid #2a2f3a">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="dmEnabled" ${ws.dmEnabled ? 'checked' : ''} onchange="document.getElementById('dmConfig').style.display=this.checked?'block':'none'">
        <span style="font-weight:600;color:#fff">Send DM on Join</span>
        <span style="font-size:11px;color:#8b8fa3;margin-left:auto">${ws.dmEnabled ? '▼' : '► Tick to configure'}</span>
      </label>
      <div id="dmConfig" style="display:${ws.dmEnabled ? 'block' : 'none'};margin-top:8px">
        <textarea id="dmMessage" placeholder="DM welcome message..." style="min-height:60px;margin:0">${ws.dmMessage || ''}</textarea>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:8px">
          <input type="checkbox" id="dmUseEmbed" ${ws.dmUseEmbed ? 'checked' : ''}>
          <span style="font-size:13px;color:#b0b0b0">Use embed for DM</span>
        </label>
      </div>
    </div>

    <div style="margin-top:16px;padding:16px;background:#1a1a1d;border-radius:6px;border:1px solid #2a2f3a">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="antiSpamEnabled" ${ws.antiSpamEnabled ? 'checked' : ''} onchange="document.getElementById('antiSpamConfig').style.display=this.checked?'block':'none'">
        <span style="font-weight:600;color:#fff">Anti-spam Protection</span>
        <span style="font-size:11px;color:#8b8fa3;margin-left:auto">${ws.antiSpamEnabled ? '▼' : '► Tick to configure'}</span>
      </label>
      <div id="antiSpamConfig" style="display:${ws.antiSpamEnabled ? 'block' : 'none'};margin-top:8px">
        <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Exempt Role IDs (comma separated)</label>
        <input type="text" id="antiSpamRoles" value="${(ws.antiSpamRoles||[]).join(', ')}" placeholder="Role IDs to exempt" style="margin:0">
      </div>
    </div>

    <button class="small" type="button" onclick="addRotationMessage()" style="margin-top:12px">+ Add Rotation Message</button>

    <div style="display:flex;gap:10px;margin-top:16px">
      <button onclick="saveWelcomeSettings()">💾 Save Welcome Settings</button>
      <button class="small" onclick="previewWelcome()" style="background:#2a2f3a">👁️ Preview</button>
    </div>
  </div>
</div>

<!-- Goodbye Messages Card -->
<div class="card">
  <h2>👋 Goodbye Messages</h2>
  <p style="color:#b0b0b0">Configure automatic goodbye messages when members leave.</p>
  <div style="margin-top:16px">
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:12px">
      <input type="checkbox" id="goodbyeEnabled" ${ws.goodbyeEnabled ? 'checked' : ''}>
      <span style="font-weight:600;color:#fff">Enable Goodbye Messages</span>
    </label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div>
        <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Channel</label>
        <select id="goodbyeChannelId" style="margin:0">
          <option value="">-- Select channel --</option>
          ${ws.goodbyeChannelId ? '<option value="' + ws.goodbyeChannelId + '" selected>#' + ws.goodbyeChannelId + ' (loading...)</option>' : ''}
        </select>
      </div>
      <div>
        <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Message Mode</label>
        <select id="goodbyeMessageMode" style="margin:0">
          <option value="single" ${ws.goodbyeMessageMode==='single'?'selected':''}>Single</option>
          <option value="rotation" ${ws.goodbyeMessageMode==='rotation'?'selected':''}>Rotation</option>
          <option value="random" ${ws.goodbyeMessageMode==='random'?'selected':''}>Random</option>
        </select>
      </div>
    </div>
    <div>
      <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Goodbye Message</label>
      <textarea id="goodbyeMessage" placeholder="Goodbye {username}!" style="min-height:60px;margin:0">${ws.goodbyeMessage || ''}</textarea>
    </div>
    <div style="margin-top:12px;padding:16px;background:#1a1a1d;border-radius:6px;border:1px solid #2a2f3a">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="goodbyeUseEmbed" ${ws.goodbyeUseEmbed ? 'checked' : ''} onchange="document.getElementById('goodbyeEmbedConfig').style.display=this.checked?'block':'none'">
        <span style="font-weight:600;color:#fff">Use Embed</span>
        <span style="font-size:11px;color:#8b8fa3;margin-left:auto">${ws.goodbyeUseEmbed ? '▼ Click to collapse' : '► Tick to configure'}</span>
      </label>
      <div id="goodbyeEmbedConfig" style="display:${ws.goodbyeUseEmbed ? 'block' : 'none'};margin-top:12px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Embed Title</label>
          <input type="text" id="goodbyeEmbedTitle" value="${(ws.goodbyeEmbedTitle||'').replace(/"/g,'&quot;')}" style="margin:0">
        </div>
        <div>
          <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Embed Color</label>
          <input type="text" id="goodbyeEmbedColorHex" value="${ws.goodbyeEmbedColor || '#E74C3C'}" style="margin:0">
        </div>
      </div>
      <div style="margin-top:8px">
        <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Embed Description</label>
        <textarea id="goodbyeEmbedDescription" style="min-height:60px;margin:0">${(ws.goodbyeEmbedDescription||'').replace(/</g,'&lt;')}</textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px">
        <div>
          <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Thumbnail</label>
          <select id="goodbyeEmbedThumbnail" style="margin:0">
            <option value="avatar" ${ws.goodbyeEmbedThumbnail==='avatar'?'selected':''}>User Avatar</option>
            <option value="custom" ${ws.goodbyeEmbedThumbnail==='custom'?'selected':''}>Custom URL</option>
            <option value="none" ${ws.goodbyeEmbedThumbnail==='none'?'selected':''}>None</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Thumbnail URL</label>
          <input type="text" id="goodbyeEmbedThumbnailUrl" value="${ws.goodbyeEmbedThumbnailUrl || ''}" style="margin:0">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px">
        <div>
          <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Image URL</label>
          <input type="text" id="goodbyeEmbedImage" value="${ws.goodbyeEmbedImage || ''}" style="margin:0">
        </div>
        <div>
          <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Footer</label>
          <input type="text" id="goodbyeEmbedFooter" value="${(ws.goodbyeEmbedFooter||'').replace(/"/g,'&quot;')}" style="margin:0">
        </div>
      </div>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:16px">
      <button onclick="saveGoodbyeSettings()">💾 Save Goodbye Settings</button>
      <button class="small" onclick="previewGoodbye()" style="background:#2a2f3a">👁️ Preview</button>
    </div>
  </div>
</div>

<!-- Auto-Roles Card -->
<div class="card">
  <h2>🎭 Auto Roles</h2>
  <p style="color:#b0b0b0">Automatically assign roles to new members when they join.</p>
  <div style="margin-top:16px">
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;align-items:end;margin-bottom:12px">
      <div>
        <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Role ID</label>
        <input type="text" id="autoRoleId" placeholder="Role ID" style="margin:0">
      </div>
      <div>
        <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Condition</label>
        <select id="autoRoleCondition" style="margin:0">
          <option value="always">Always</option>
          <option value="account_age">Account Age</option>
          <option value="verified">Verified Email</option>
        </select>
      </div>
      <div>
        <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Min Age (days)</label>
        <input type="number" id="autoRoleMinAge" value="7" min="0" style="margin:0">
      </div>
      <button class="small" onclick="addAutoRole()" style="margin-bottom:0">+ Add</button>
    </div>
    <div style="margin-bottom:12px">
      ${(ws.autoRoles||[]).map(r => {
        const rid = r.roleId || r;
        const cond = r.condition || 'always';
        return '<div class="role-display" data-role-id="' + rid + '" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#1a1a1d;border-radius:4px;margin-bottom:4px">' +
          '<span class="role-name-badge" style="flex:1;font-size:13px">' + rid + '</span>' +
          '<span style="font-size:11px;color:#8b8fa3">' + cond + '</span>' +
          '<button class="small danger" onclick="removeAutoRole(\'' + rid + '\')" style="margin:0;padding:2px 8px;font-size:11px">Remove</button>' +
          '</div>';
      }).join('')}
    </div>
    <details style="margin-top:8px">
      <summary style="cursor:pointer;color:#b0b0b0;font-weight:600">📋 Bulk Add Roles</summary>
      <div style="margin-top:10px;padding:12px;background:#1a1a1d;border-radius:6px;border:1px solid #2a2f3a">
        <p style="font-size:12px;color:#8b8fa3;margin:0 0 8px 0">Select roles from your server or paste IDs. Roles are added with rate-limiting to avoid Discord API overload.</p>
        <div style="margin-bottom:8px">
          <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Select Server Roles</label>
          <div id="bulkRolePicker" style="max-height:200px;overflow-y:auto;border:1px solid #3a3a42;border-radius:4px;padding:4px;background:#0e0e10">
            <div style="padding:8px;color:#8b8fa3;font-size:12px">Loading roles...</div>
          </div>
          <div style="display:flex;gap:6px;margin-top:6px">
            <button class="small" onclick="bulkSelectAll(true)" style="width:auto;margin:0;padding:4px 8px;font-size:11px">Select All</button>
            <button class="small" onclick="bulkSelectAll(false)" style="width:auto;margin:0;padding:4px 8px;font-size:11px">Deselect All</button>
            <span id="bulkSelectedCount" style="font-size:11px;color:#8b8fa3;line-height:28px;margin-left:auto">0 selected</span>
          </div>
        </div>
        <div style="margin-bottom:8px">
          <label style="font-size:12px;color:#8b8fa3;display:block;margin-bottom:4px">Or paste Role IDs (comma / newline separated)</label>
          <textarea id="bulkRoleIds" placeholder="123456789012345678, 234567890123456789" style="min-height:40px;margin:0;font-size:12px"></textarea>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="small" onclick="bulkAddRolesRateLimited()" style="margin:0;width:auto;background:#4caf50;font-weight:600">Add Selected Roles</button>
          <div id="bulkAddProgress" style="font-size:11px;color:#8b8fa3;display:none">
            <span id="bulkAddProgressText">Adding...</span>
          </div>
        </div>
      </div>
    </details>
    <button class="small" onclick="testAutoRoles()" style="margin-top:8px;background:#2a2f3a">🧪 Test Auto Roles</button>
  </div>
</div>

<!-- Preview Modal -->
<div id="welcomePreviewModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:1000;justify-content:center;align-items:center">
  <div style="background:#36393f;border-radius:8px;padding:20px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="margin:0;color:#fff">Preview</h3>
      <button class="small" onclick="closePreviewModal()" style="background:#2a2f3a;margin:0">✕</button>
    </div>
    <div id="previewContent"></div>
  </div>
</div>

<script>
// Populate channel selectors
(function() {
  var welcomeVal = '${ws.channelId || ''}';
  var goodbyeVal = '${ws.goodbyeChannelId || ''}';
  fetch('/api/channels').then(function(r) { return r.json(); }).then(function(channels) {
    var textChannels = channels.filter(function(c) { return c.type === 0 || c.type === 5; });
    ['welcomeChannelId', 'goodbyeChannelId'].forEach(function(selId) {
      var sel = document.getElementById(selId);
      if (!sel) return;
      var curVal = sel.value;
      sel.innerHTML = '<option value="">-- Select channel --</option>';
      textChannels.forEach(function(ch) {
        var opt = document.createElement('option');
        opt.value = ch.id;
        opt.textContent = '#' + ch.name;
        if (ch.id === curVal) opt.selected = true;
        sel.appendChild(opt);
      });
    });
  }).catch(function() {});
})();

// Role caching and populating for rotation message role selectors
var _cachedRoles = null;
function populateRoleSelectors() {
  function fill(roles) {
    document.querySelectorAll('.rotation-message-role').forEach(function(sel) {
      var curVal = sel.value || sel.getAttribute('data-val') || '';
      if (sel.options.length > 1) return; // already populated
      sel.innerHTML = '<option value="">Any role</option>';
      roles.forEach(function(r) {
        var opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = '@' + r.name;
        if (r.id === curVal) opt.selected = true;
        sel.appendChild(opt);
      });
    });
  }
  if (_cachedRoles) { fill(_cachedRoles); return; }
  fetch('/api/guild-roles').then(function(r) { return r.json(); }).then(function(data) {
    _cachedRoles = (data.roles || []).filter(function(r) { return r.name !== '@everyone' && !r.managed; });
    fill(_cachedRoles);
  }).catch(function() {});
}
// Set data-val for pre-existing selectors that have saved roleId values
(function() {
  var msgs = ${JSON.stringify((ws.messages||[]).map(m => m.roleId || ''))};
  var selects = document.querySelectorAll('.rotation-message-role');
  selects.forEach(function(sel, i) { if (msgs[i]) sel.setAttribute('data-val', msgs[i]); });
  populateRoleSelectors();
})();

function addEmbedField() {
  const container = document.getElementById('embedFieldsContainer');
  const row = document.createElement('div');
  row.className = 'embed-field-row';
  row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center;background:#0e0e10;padding:8px;border-radius:4px';
  row.innerHTML = '<input class="embed-field-name" placeholder="Field Name" style="flex:1;margin:0"><input class="embed-field-value" placeholder="Field Value" style="flex:2;margin:0"><label style="display:flex;align-items:center;gap:4px;white-space:nowrap"><input type="checkbox" class="embed-field-inline"><span style="font-size:12px">Inline</span></label><button class="small danger" type="button" onclick="removeEmbedField(this)">✕</button>';
  container.appendChild(row);
}
function removeEmbedField(btn) { btn.closest('.embed-field-row').remove(); }

function addRotationMessage() {
  const container = document.getElementById('messagesContainer');
  const count = container.children.length + 1;
  const row = document.createElement('div');
  row.className = 'rotation-message-row';
  row.style.cssText = 'background:#1b1d20;padding:12px;border-radius:6px;margin-bottom:8px;border-left:3px solid #9146ff';
  row.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-weight:500">Message ' + count + '</span><button class="small danger" type="button" onclick="removeRotationMessage(this)">Remove</button></div><textarea class="rotation-message-text" placeholder="Welcome message..." style="width:100%;min-height:60px;resize:vertical;margin:0"></textarea><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px"><div><label style="font-size:11px;color:#8b8fa3">Weight (rarity)</label><input type="number" class="rotation-message-weight" min="1" max="100" value="1" style="margin:0;font-size:12px" title="Higher = more likely. Default 1"></div><div><label style="font-size:11px;color:#8b8fa3">Role filter (optional)</label><select class="rotation-message-role" style="margin:0;font-size:12px"><option value="">Any role</option></select></div></div>';
  container.appendChild(row);
  populateRoleSelectors();
}
function removeRotationMessage(btn) {
  btn.closest('.rotation-message-row').remove();
  document.querySelectorAll('.rotation-message-row').forEach(function(row, i) { row.querySelector('span').textContent = 'Message ' + (i + 1); });
}

function collectEmbedFields() {
  var fields = [];
  document.querySelectorAll('.embed-field-row').forEach(function(row) {
    var name = row.querySelector('.embed-field-name').value.trim();
    var value = row.querySelector('.embed-field-value').value.trim();
    var inline = row.querySelector('.embed-field-inline').checked;
    if (name && value) fields.push({ name: name, value: value, inline: inline });
  });
  return fields;
}

function collectRotationMessages() {
  var messages = [];
  document.querySelectorAll('.rotation-message-row').forEach(function(row) {
    var textarea = row.querySelector('.rotation-message-text');
    var weightInput = row.querySelector('.rotation-message-weight');
    var roleSelect = row.querySelector('.rotation-message-role');
    var text = textarea ? textarea.value.trim() : '';
    if (text) {
      var msg = { text: text };
      var w = weightInput ? parseInt(weightInput.value) : 1;
      if (w && w > 1) msg.weight = w;
      var rId = roleSelect ? roleSelect.value : '';
      if (rId) msg.roleId = rId;
      messages.push(msg);
    }
  });
  return messages;
}

function saveWelcomeSettings() {
  var settings = {
    enabled: document.getElementById('welcomeEnabled').checked,
    channelId: document.getElementById('welcomeChannelId').value.trim(),
    message: document.getElementById('welcomeMessage').value.trim(),
    useEmbed: document.getElementById('useEmbed').checked,
    embedTitle: document.getElementById('embedTitle').value.trim(),
    embedDescription: document.getElementById('embedDescription').value.trim(),
    embedColor: document.getElementById('embedColorHex').value.trim() || '#9146ff',
    embedThumbnail: document.getElementById('embedThumbnail').value,
    embedThumbnailUrl: document.getElementById('embedThumbnailUrl').value.trim(),
    embedImage: document.getElementById('embedImage').value.trim(),
    embedFooter: document.getElementById('embedFooter').value.trim(),
    embedFields: collectEmbedFields(),
    messageMode: document.getElementById('messageMode').value,
    messages: collectRotationMessages(),
    dmEnabled: document.getElementById('dmEnabled').checked,
    dmMessage: document.getElementById('dmMessage').value.trim(),
    dmUseEmbed: document.getElementById('dmUseEmbed').checked,
    antiSpamEnabled: document.getElementById('antiSpamEnabled').checked,
    antiSpamRoles: document.getElementById('antiSpamRoles').value.split(/[,\\n]/).map(function(s){return s.trim()}).filter(Boolean)
  };
  fetch('/api/welcome-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
    .then(function(r){return r.json()}).then(function(data) {
      if (data.success) { alert('\\u2705 Welcome settings saved!'); location.reload(); }
      else alert('\\u274C Error: ' + (data.error || 'Unknown error'));
    }).catch(function(err){ alert('\\u274C Error: ' + err.message); });
}

function saveGoodbyeSettings() {
  var settings = {
    goodbyeEnabled: document.getElementById('goodbyeEnabled').checked,
    goodbyeChannelId: document.getElementById('goodbyeChannelId').value.trim(),
    goodbyeMessage: document.getElementById('goodbyeMessage').value.trim(),
    goodbyeUseEmbed: document.getElementById('goodbyeUseEmbed').checked,
    goodbyeEmbedTitle: document.getElementById('goodbyeEmbedTitle').value.trim(),
    goodbyeEmbedDescription: document.getElementById('goodbyeEmbedDescription').value.trim(),
    goodbyeEmbedColor: document.getElementById('goodbyeEmbedColorHex').value.trim() || '#E74C3C',
    goodbyeEmbedThumbnail: document.getElementById('goodbyeEmbedThumbnail').value,
    goodbyeEmbedThumbnailUrl: (document.getElementById('goodbyeEmbedThumbnailUrl') || {}).value || '',
    goodbyeEmbedImage: document.getElementById('goodbyeEmbedImage').value.trim(),
    goodbyeEmbedFooter: document.getElementById('goodbyeEmbedFooter').value.trim(),
    goodbyeMessageMode: document.getElementById('goodbyeMessageMode').value
  };
  fetch('/api/welcome-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
    .then(function(r){return r.json()}).then(function(data) {
      if (data.success) { alert('\\u2705 Goodbye settings saved!'); location.reload(); }
      else { alert('\\u274c Failed: ' + (data.error || 'Unknown error')); }
    }).catch(function(e) { alert('\\u274c Error: ' + e.message); });
}
function bulkSelectAll(selectAll) {
  document.querySelectorAll('#bulkRolePicker input[type="checkbox"]').forEach(function(cb) { cb.checked = selectAll; });
  updateBulkCount();
}
function updateBulkCount() {
  var count = document.querySelectorAll('#bulkRolePicker input[type="checkbox"]:checked').length;
  var el = document.getElementById('bulkSelectedCount');
  if (el) el.textContent = count + ' selected';
}
function loadServerRoles() {
  fetch('/api/guild-roles').then(function(r){ return r.json(); }).then(function(data) {
    var container = document.getElementById('bulkRolePicker');
    if (!container) return;
    var roles = (data.roles || []).filter(function(r) { return r.name !== '@everyone' && !r.managed; })
      .sort(function(a, b) { return b.position - a.position; });
    if (roles.length === 0) {
      container.innerHTML = '<div style="padding:8px;color:#8b8fa3;font-size:12px">No roles found</div>';
      return;
    }
    var existingIds = new Set(${JSON.stringify((ws.autoRoles || []).map(r => r.roleId || r))});
    container.innerHTML = roles.map(function(role) {
      var color = role.hexColor && role.hexColor !== '#000000' ? role.hexColor : '#8b8fa3';
      var alreadyAdded = existingIds.has(role.id);
      return '<label style="display:flex;align-items:center;gap:8px;padding:4px 8px;cursor:pointer;border-radius:3px" onmouseover="this.style.background=\\'#1a1e28\\'" onmouseout="this.style.background=\\'\\'">' +
        '<input type="checkbox" value="' + role.id + '" onchange="updateBulkCount()"' + (alreadyAdded ? ' disabled' : '') + '>' +
        '<span style="width:12px;height:12px;border-radius:50%;background:' + color + ';flex-shrink:0"></span>' +
        '<span style="font-size:12px;color:' + (alreadyAdded ? '#666' : '#e0e0e0') + '">' + role.name + (alreadyAdded ? ' (added)' : '') + '</span>' +
      '</label>';
    }).join('');
  }).catch(function() {
    var container = document.getElementById('bulkRolePicker');
    if (container) container.innerHTML = '<div style="padding:8px;color:#ef5350;font-size:12px">Failed to load roles</div>';
  });
}
function bulkAddRolesRateLimited() {
  // Collect from checkboxes
  var roleIds = [];
  document.querySelectorAll('#bulkRolePicker input[type="checkbox"]:checked').forEach(function(cb) {
    if (cb.value && !cb.disabled) roleIds.push(cb.value);
  });
  // Also collect from textarea
  var textIds = (document.getElementById('bulkRoleIds').value || '').split(/[,\\n]/).map(function(s){return s.trim()}).filter(function(s){return s && /^\\d+$/.test(s)});
  textIds.forEach(function(id) { if (roleIds.indexOf(id) === -1) roleIds.push(id); });

  if (roleIds.length === 0) { alert('No roles selected'); return; }
  if (roleIds.length > 50) { if (!confirm('Adding ' + roleIds.length + ' roles. This may take a moment. Continue?')) return; }

  var progress = document.getElementById('bulkAddProgress');
  var progressText = document.getElementById('bulkAddProgressText');
  progress.style.display = 'inline';

  // Rate-limited: send in batches of 5 with 1s delay between batches
  var batchSize = 5;
  var batches = [];
  for (var i = 0; i < roleIds.length; i += batchSize) {
    batches.push(roleIds.slice(i, i + batchSize));
  }

  var totalAdded = 0;
  var batchIdx = 0;
  function processBatch() {
    if (batchIdx >= batches.length) {
      progressText.textContent = '\\u2705 Done! Added ' + totalAdded + ' roles.';
      setTimeout(function() { location.reload(); }, 1500);
      return;
    }
    progressText.textContent = 'Adding batch ' + (batchIdx + 1) + '/' + batches.length + '...';
    fetch('/api/welcome-settings/bulk-add-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleIds: batches[batchIdx] })
    }).then(function(r){return r.json()}).then(function(data) {
      totalAdded += (data.added || 0);
      batchIdx++;
      setTimeout(processBatch, 1000); // 1s delay between batches
    }).catch(function(err) {
      progressText.textContent = '\\u274C Error: ' + err.message;
    });
  }
  processBatch();
}

function addAutoRole() {
  var roleId = document.getElementById('autoRoleId').value.trim();
  if (!roleId) { alert('Enter a Role ID'); return; }
  var condition = document.getElementById('autoRoleCondition').value;
  var minAge = parseInt(document.getElementById('autoRoleMinAge').value) || 7;
  fetch('/api/welcome-settings/add-role', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roleId: roleId, condition: condition, minAccountAge: minAge }) })
    .then(function(r){return r.json()}).then(function(data) { if (data.success) location.reload(); else alert('\\u274C Error: ' + (data.error || 'Unknown error')); })
    .catch(function(err){ alert('\\u274C Error: ' + err.message); });
}

loadServerRoles();

function removeAutoRole(roleId) {
  fetch('/api/welcome-settings/remove-role', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roleId: roleId }) })
    .then(function(r){return r.json()}).then(function(data) { if (data.success) location.reload(); else alert('\\u274C Error: ' + (data.error || 'Unknown error')); })
    .catch(function(err){ alert('\\u274C Error: ' + err.message); });
}

function bulkAddRoles() {
  var input = document.getElementById('bulkRoleIds').value;
  var roleIds = input.split(/[,\\n]/).map(function(s){return s.trim()}).filter(function(s){return s && /^\\d+$/.test(s)});
  if (roleIds.length === 0) { alert('No valid role IDs found'); return; }
  fetch('/api/welcome-settings/bulk-add-roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roleIds: roleIds }) })
    .then(function(r){return r.json()}).then(function(data) {
      if (data.success) { alert('\\u2705 Added ' + (data.added || roleIds.length) + ' roles'); location.reload(); }
      else alert('\\u274C Error: ' + (data.error || 'Unknown error'));
    }).catch(function(err){ alert('\\u274C Error: ' + err.message); });
}

function testAutoRoles() {
  fetch('/api/welcome-settings/test-roles', { method: 'POST' })
    .then(function(r){return r.json()}).then(function(data) {
      if (data.success) alert('\\u2705 Test complete!\\n' + (data.results || []).join('\\n'));
      else alert('\\u274C Error: ' + (data.error || 'Unknown error'));
    }).catch(function(err){ alert('\\u274C Error: ' + err.message); });
}

function replacePlaceholders(text, data) {
  return text.replace(/{user}/g,data.user).replace(/{username}/g,data.username).replace(/{server}/g,data.server).replace(/{count}/g,data.count).replace(/{position}/g,data.position).replace(/{time}/g,data.time).replace(/{avatar}/g,data.avatar).replace(/{mention}/g,data.user);
}

function previewWelcome() {
  var useEmbed = document.getElementById('useEmbed').checked;
  var modal = document.getElementById('welcomePreviewModal');
  var content = document.getElementById('previewContent');
  var data = { user:'@ExampleUser', username:'ExampleUser', server:'My Awesome Server', count:'1,234', position:'1234', time:new Date().toLocaleString(), avatar:'https://cdn.discordapp.com/embed/avatars/0.png' };
  if (useEmbed) {
    var color = document.getElementById('embedColorHex').value || '#9146ff';
    var title = replacePlaceholders(document.getElementById('embedTitle').value || '', data);
    var desc = replacePlaceholders(document.getElementById('embedDescription').value || '', data);
    var footer = replacePlaceholders(document.getElementById('embedFooter').value || '', data);
    var image = document.getElementById('embedImage').value;
    var thumbnail = document.getElementById('embedThumbnail').value;
    var thumbnailUrl = thumbnail==='avatar' ? data.avatar : (thumbnail==='custom' ? document.getElementById('embedThumbnailUrl').value : '');
    var fieldsHtml = '';
    collectEmbedFields().forEach(function(f) {
      fieldsHtml += '<div style="flex:'+(f.inline?'1':'100%')+';min-width:'+(f.inline?'100px':'100%')+';margin-top:8px"><div style="font-weight:600;font-size:13px;color:#fff">'+f.name+'</div><div style="font-size:14px;color:#dcddde">'+f.value+'</div></div>';
    });
    content.innerHTML = '<div style="display:flex;gap:16px"><div style="width:4px;background:'+color+';border-radius:4px"></div><div style="flex:1">'+(title?'<div style="font-weight:600;color:#fff;margin-bottom:8px">'+title+'</div>':'')+(desc?'<div style="color:#dcddde;white-space:pre-wrap">'+desc+'</div>':'')+(fieldsHtml?'<div style="display:flex;flex-wrap:wrap;gap:8px">'+fieldsHtml+'</div>':'')+(image?'<img src="'+image+'" style="max-width:100%;margin-top:12px;border-radius:4px">':'')+(footer?'<div style="margin-top:12px;font-size:12px;color:#72767d">'+footer+'</div>':'')+'</div>'+(thumbnailUrl?'<img src="'+thumbnailUrl+'" style="width:80px;height:80px;border-radius:4px;object-fit:cover">':'')+'</div>';
  } else {
    var msg = replacePlaceholders(document.getElementById('welcomeMessage').value || 'Welcome {user} to {server}!', data);
    content.innerHTML = '<div style="color:#dcddde;white-space:pre-wrap">'+msg+'</div>';
  }
  modal.style.display = 'flex';
}

function previewGoodbye() {
  var useEmbed = document.getElementById('goodbyeUseEmbed').checked;
  var modal = document.getElementById('welcomePreviewModal');
  var content = document.getElementById('previewContent');
  var data = { user:'@ExampleUser', username:'ExampleUser', server:'My Awesome Server', count:'1,233', position:'1234', time:new Date().toLocaleString(), avatar:'https://cdn.discordapp.com/embed/avatars/0.png' };
  if (useEmbed) {
    var color = document.getElementById('goodbyeEmbedColorHex').value || '#E74C3C';
    var title = replacePlaceholders(document.getElementById('goodbyeEmbedTitle').value || '', data);
    var desc = replacePlaceholders(document.getElementById('goodbyeEmbedDescription').value || '', data);
    var footer = replacePlaceholders(document.getElementById('goodbyeEmbedFooter').value || '', data);
    var thumbnailUrl = document.getElementById('goodbyeEmbedThumbnail').value==='avatar' ? data.avatar : '';
    content.innerHTML = '<div style="display:flex;gap:16px"><div style="width:4px;background:'+color+';border-radius:4px"></div><div style="flex:1">'+(title?'<div style="font-weight:600;color:#fff;margin-bottom:8px">'+title+'</div>':'')+(desc?'<div style="color:#dcddde;white-space:pre-wrap">'+desc+'</div>':'')+(footer?'<div style="margin-top:12px;font-size:12px;color:#72767d">'+footer+'</div>':'')+'</div>'+(thumbnailUrl?'<img src="'+thumbnailUrl+'" style="width:80px;height:80px;border-radius:4px;object-fit:cover">':'')+'</div>';
  } else {
    var msg = replacePlaceholders(document.getElementById('goodbyeMessage').value || 'Goodbye {username}!', data);
    content.innerHTML = '<div style="color:#dcddde;white-space:pre-wrap">'+msg+'</div>';
  }
  modal.style.display = 'flex';
}

function closePreviewModal() { document.getElementById('welcomePreviewModal').style.display = 'none'; }
document.getElementById('welcomePreviewModal')?.addEventListener('click', function(e) { if (e.target === this) closePreviewModal(); });

function resolveRoleNames() {
  document.querySelectorAll('.role-name-badge').forEach(function(badge) {
    var parent = badge.closest('.role-display');
    var roleId = parent ? parent.getAttribute('data-role-id') : null;
    if (!roleId) return;
    fetch('/role/info/' + roleId).then(function(r){return r.json()}).then(function(data) {
      if (data && data.name) { badge.textContent = data.name; if (data.color) badge.style.borderLeft = '3px solid #' + data.color.toString(16).padStart(6, '0'); }
      else { badge.textContent = 'Unknown Role'; badge.style.color = '#ff6b6b'; }
    }).catch(function() { badge.textContent = 'Lookup Failed'; badge.style.color = '#ff6b6b'; });
  });
}
document.addEventListener('DOMContentLoaded', resolveRoleNames);
</script>
`;
}
