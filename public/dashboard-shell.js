// ── CSRF Protection: intercept fetch to add CSRF token to state-changing requests ──
(function() {
  var originalFetch = window.fetch;
  function getCsrfToken() {
    var match = document.cookie.match(/(?:^|;\s*)_csrf=([^;]*)/);
    return match ? match[1] : '';
  }
  window.fetch = function(url, options) {
    options = options || {};
    var method = (options.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      options.headers = options.headers || {};
      if (options.headers instanceof Headers) {
        if (!options.headers.has('X-CSRF-Token')) options.headers.set('X-CSRF-Token', getCsrfToken());
      } else {
        if (!options.headers['X-CSRF-Token']) options.headers['X-CSRF-Token'] = getCsrfToken();
      }
    }
    return originalFetch.call(this, url, options);
  };
})();

function highlightOnPage(text) {
  var sr = document.getElementById('searchResults');
  if (sr) sr.classList.remove('visible');
  var els = document.querySelectorAll('.card h2, .card h3, label, table th, details summary, .cmd-card .name');
  for (var i = 0; i < els.length; i++) {
    if (els[i].textContent.trim() === text) {
      els[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
      els[i].style.transition = 'background 0.3s';
      els[i].style.background = 'rgba(145,70,255,0.3)';
      els[i].style.borderRadius = '4px';
      setTimeout(function(el) { el.style.background = ''; }.bind(null, els[i]), 2500);
      break;
    }
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var main = document.querySelector('.main');
  if (main) main.classList.add('content-loaded');

  if (_previewTier) {
    document.querySelectorAll('a[href^="/"]').forEach(function(anchor) {
      var href = anchor.getAttribute('href') || '';
      if (!href || href.indexOf('/logout') === 0 || href.indexOf('/switch-server') === 0) return;
      if (href.indexOf('previewTier=') !== -1) return;
      anchor.setAttribute('href', _withPreview(href));
    });
  }

  var si = document.getElementById('globalSearch');
  var sr = document.getElementById('searchResults');
  if (!si || !sr) return;

  var debounce;
  si.addEventListener('input', function() {
    clearTimeout(debounce);
    debounce = setTimeout(function() {
      var q = si.value.trim().toLowerCase();
      if (q.length < 2) { sr.classList.remove('visible'); sr.innerHTML = ''; return; }

      var pageMatches = _allPages.filter(function(p) {
        if (!_userAccess.includes(p.c.toLowerCase())) return false;
        // Filter by page access if custom rules exist
        if (_hasCustomAccess && p.u) {
          var slug = '';
          if (p.u.indexOf('?tab=') !== -1) { slug = p.u.split('?tab=')[1]; }
          else { slug = p.u.replace(/^\//, '') || 'overview'; }
          if (!_pageAccessMap[slug]) return false;
        }
        return p.l.toLowerCase().indexOf(q) !== -1 || p.k.indexOf(q) !== -1 || p.c.toLowerCase().indexOf(q) !== -1;
      });

      var domMatches = [];
      var seen = {};
      document.querySelectorAll('.card h2, .card h3, label, table th, details summary, .cmd-card .name').forEach(function(el) {
        var txt = el.textContent.trim();
        if (txt.toLowerCase().indexOf(q) !== -1 && !seen[txt] && txt.length > 1) {
          seen[txt] = true;
          domMatches.push(txt);
        }
      });

      if (pageMatches.length === 0 && domMatches.length === 0) {
        sr.innerHTML = '<div class="search-no-results">No results for &quot;' + q + '&quot;</div>';
        sr.classList.add('visible');
        return;
      }

      var html = '';
      pageMatches.forEach(function(p) {
        var pSlug = '';
        if (p.u.indexOf('?tab=') !== -1) { pSlug = p.u.split('?tab=')[1]; }
        else { pSlug = p.u.replace(/^\//, '') || 'overview'; }
        var roIcon = (_hasCustomAccess && _pageAccessMap[pSlug] === 'read') ? ' 🔒' : '';
        html += '<a class="search-result" href="' + _withPreview(p.u) + '">' +
          '<span class="search-result-icon">' + p.i + '</span>' +
          '<span class="search-result-label">' + p.l + roIcon + '</span>' +
          '<span class="search-result-cat">' + p.c + '</span></a>';
      });
      if (domMatches.length > 0) {
        html += '<div style="padding:6px 14px;font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #2a2f3a;margin-top:2px">On this page</div>';
        domMatches.slice(0, 10).forEach(function(txt) {
          html += '<div class="search-result" data-highlight="' + txt.replace(/"/g, '&quot;') + '">' +
            '<span class="search-result-icon">📌</span>' +
            '<span class="search-result-label">' + txt + '</span>' +
            '<span class="search-result-cat">Current</span></div>';
        });
      }
      sr.innerHTML = html;
      sr.classList.add('visible');
    }, 180);
  });

  sr.addEventListener('click', function(e) {
    var item = e.target.closest('[data-highlight]');
    if (item) highlightOnPage(item.getAttribute('data-highlight'));
  });

  si.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { sr.classList.remove('visible'); si.value = ''; si.blur(); }
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.topbar-search')) sr.classList.remove('visible');
  });

  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); si.focus(); si.select(); }
  });
});

// Member Logs (Audit) helpers available on all pages
let auditPerEventChannelsDraft = {};
let auditPerEventPingsDraft = {};

const auditEventLabels = {
  logMemberJoins: 'Member joins & join position',
  logMemberLeaves: 'Member leaves',
  logMemberBans: 'Member bans & unbans',
  logMemberBoosts: 'Boosts / stops boosting',
  warnNewAccounts: 'Warn on new accounts',
  logUsernameChanges: 'Name changes',
  logAvatarChanges: 'Avatar changes',
  logRoleChanges: 'Role updates',
  logMemberTimeouts: 'Timeouts',
  logMemberMutes: 'Mute roles',
  logMessageEdits: 'Message edits',
  logMessageDeletes: 'Message deletes',
  logMessagePins: 'Message pins',
  logServerUpdates: 'Server updates',
  logIntegrations: 'Integrations'
};

const auditPingLabels = {
  logMemberBans: 'Member bans & unbans',
  logRoleChanges: 'Role updates',
  logMemberTimeouts: 'Timeouts',
  logMemberMutes: 'Mute roles'
};

const auditPreviewTexts = {
  logMemberJoins: '✅ User Antho#1234 joined the server (ID: 123, Position: #42)',
  logMemberLeaves: '❌ User Antho#1234 left the server (ID: 123)',
  logMemberBans: '⛔ User Antho#1234 was banned (Reason: spam)',
  logMemberBoosts: '💜 User Antho#1234 started boosting the server',
  warnNewAccounts: '⚠️ New account detected: Antho#1234 (created 2 days ago)',
  logUsernameChanges: '✏️ Username/Nickname changed: OldName → NewName',
  logAvatarChanges: '🖼️ Avatar updated for User Antho#1234',
  logRoleChanges: '🔧 Roles updated: +@Mod -@Guest (2 added, 1 removed)',
  logMemberTimeouts: '⏱️ User Antho#1234 timed out for 10 minutes',
  logMemberMutes: '🔇 User Antho#1234 muted (Mute Role)',
  logMessageEdits: '✏️ Message edited in #general: "old text" → "new text"',
  logMessageDeletes: '🗑️ Message deleted in #general (by Antho#1234)',
  logMessagePins: '📌 Message pinned in #general (by Antho#1234)',
  logServerUpdates: '⚙️ Server name changed: OldName → NewName',
  logIntegrations: '🤖 Discord Bot Integration added'
};

function updateAuditChannelDropdown() {
  updateAuditChannelName();
}

function updateAuditLogLevel() {
  // Placeholder for log level change handler
}

function updateLivePreview() {
  const selected = [];
  const events = ['logMemberJoins', 'logMemberLeaves', 'logMemberBans', 'logMemberBoosts', 'warnNewAccounts', 'logUsernameChanges', 'logAvatarChanges', 'logRoleChanges', 'logMemberTimeouts', 'logMemberMutes', 'logMessageEdits', 'logMessageDeletes', 'logMessagePins', 'logServerUpdates', 'logIntegrations'];
  
  events.forEach(eventId => {
    const elem = document.getElementById(eventId);
    if (elem && elem.checked) selected.push(eventId);
  });

  const preview = document.getElementById('livePreviewContent');
  if (!preview) return;
  if (selected.length === 0) {
    preview.innerHTML = '<span style="color:#666">Select events above to see preview...</span>';
  } else {
    var html = '';
    for (var i = 0; i < selected.length; i++) {
      html += '<div style="padding:6px 0;border-bottom:1px solid #333">' + auditPreviewTexts[selected[i]] + '</div>';
    }
    preview.innerHTML = html;
  }
}

function ensureGenericModal() {
  let backdrop = document.getElementById('genericModalBackdrop');
  let modal = document.getElementById('genericModal');
  if (backdrop && modal) return { backdrop, modal };

  backdrop = document.createElement('div');
  backdrop.id = 'genericModalBackdrop';
  backdrop.style.position = 'fixed';
  backdrop.style.top = '0';
  backdrop.style.left = '0';
  backdrop.style.width = '100vw';
  backdrop.style.height = '100vh';
  backdrop.style.background = 'rgba(0,0,0,0.85)';
  backdrop.style.zIndex = '1000';
  backdrop.style.display = 'none';

  modal = document.createElement('div');
  modal.id = 'genericModal';
  modal.style.position = 'fixed';
  modal.style.top = '50%';
  modal.style.left = '50%';
  modal.style.transform = 'translate(-50%, -50%)';
  modal.style.background = '#1a1a1f';
  modal.style.padding = '0';
  modal.style.borderRadius = '12px';
  modal.style.maxWidth = '680px';
  modal.style.width = '95%';
  modal.style.zIndex = '1001';
  modal.style.display = 'none';
  modal.style.border = '2px solid #9146ff';
  modal.style.maxHeight = '85vh';
  modal.style.height = '85vh';
  modal.style.boxShadow = '0 12px 48px rgba(0,0,0,0.8)';
  modal.style.color = '#ffffff';
  modal.style.boxSizing = 'border-box';
  modal.style.overflow = 'hidden';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);

  backdrop.addEventListener('click', hideCustomModal);
  return { backdrop, modal };
}

function showCustomModal(html, onSave) {
  const { backdrop, modal } = ensureGenericModal();
  let title = 'Details';
  let cleaned = html;
  const openTag = '<h3';
  const closeTag = '</h3>';
  const openIdx = html.indexOf(openTag);
  if (openIdx !== -1) {
    const startText = html.indexOf('>', openIdx);
    const endIdx = html.indexOf(closeTag, startText + 1);
    if (startText !== -1 && endIdx !== -1) {
      title = html.slice(startText + 1, endIdx).trim() || 'Details';
      cleaned = html.slice(0, openIdx) + html.slice(endIdx + closeTag.length);
    }
  }

  const saveButton = onSave ? '<button type="button" id="modalSaveBtn" style="background:#9146ff;color:#ffffff;border:1px solid #9146ff;padding:10px 24px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;transition:all 0.2s" onmouseover="this.style.background=&#39;#7c3aed&#39;" onmouseout="this.style.background=&#39;#9146ff&#39;">Save Changes</button>' : '';
  const actionBar = '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">'
    + '<button type="button" onclick="hideCustomModal()" style="background:#3a3a42;color:#ffffff;border:1px solid #4a4a52;padding:10px 24px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;transition:all 0.2s" onmouseover="this.style.background=&#39;#4a4a52&#39;" onmouseout="this.style.background=&#39;#3a3a42&#39;">Close</button>'
    + saveButton
    + '</div>';

  modal.innerHTML = '<div style="background:#23232b;padding:20px 24px;border-bottom:1px solid #2f2f3a">'
    + '<div style="display:flex;align-items:center;justify-content:space-between">'
    + '<h2 style="margin:0;font-size:22px;font-weight:600;color:#ffffff">' + title + '</h2>'
    + '<button type="button" onclick="hideCustomModal()" style="background:transparent;border:none;color:#b0b0b0;font-size:24px;cursor:pointer;padding:0;width:32px;height:32px;border-radius:4px;transition:all 0.2s" onmouseover="this.style.background=&#39;#3a3a42&#39;" onmouseout="this.style.background=&#39;transparent&#39;">×</button>'
    + '</div></div>'
    + '<div style="padding:24px;overflow-y:auto;max-height:70vh">'
    + cleaned
    + actionBar
    + '</div>';

  if (onSave) {
    setTimeout(() => {
      const btn = document.getElementById('modalSaveBtn');
      if (btn) btn.addEventListener('click', onSave);
    }, 0);
  }

  backdrop.style.display = 'block';
  modal.style.display = 'block';
}

function hideCustomModal() {
  const backdrop = document.getElementById('genericModalBackdrop');
  const modal = document.getElementById('genericModal');
  if (backdrop) backdrop.style.display = 'none';
  if (modal) modal.style.display = 'none';
}

function openPerEventChannelsModal() {
  const rows = Object.entries(auditEventLabels).map(([id, label]) => {
    const value = auditPerEventChannelsDraft[id] || '';
    return '<div style="background:#23232b;padding:16px;border-radius:8px;margin-bottom:12px;border:1px solid #2f2f3a">'
      + '<label style="display:block;color:#b9bbbe;font-size:14px;font-weight:500;margin-bottom:10px">' + label + '</label>'
      + '<input type="text" id="perEventChannel_' + id + '" value="' + value + '" placeholder="Enter Channel ID or leave empty"'
      + ' style="background:#0f0f12;border:1px solid #3a3a42;border-radius:6px;padding:12px 14px;color:#ffffff;width:100%;box-sizing:border-box;font-size:14px;transition:border 0.2s" '
      + 'onfocus="this.style.borderColor=&#39;#9146ff&#39;" onblur="this.style.borderColor=&#39;#3a3a42&#39;" />'
      + '</div>';
  }).join('');

  const actionBar = '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">'
    + '<button type="button" id="perEventChannelsClose" style="background:#3a3a42;color:#ffffff;border:1px solid #4a4a52;padding:10px 24px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500">Close</button>'
    + '<button type="button" id="perEventChannelsSave" style="background:#9146ff;color:#ffffff;border:1px solid #9146ff;padding:10px 24px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500">Save Changes</button>'
    + '</div>';

  showCustomModal('<div><h3 style="margin:0 0 6px 0;font-size:18px;font-weight:600">Per-Event Channel Routing</h3>'
    + '<p style="color:#72767d;margin:0 0 20px 0;font-size:13px;line-height:1.5">Configure individual channel destinations for each audit event type. Leave empty to use the main log channel.</p>'
    + '<div style="max-height:450px;overflow-y:auto;padding-right:4px">' + rows + '</div>'
    + actionBar
    + '</div>');

  Object.keys(auditEventLabels).forEach(id => {
    const input = document.getElementById('perEventChannel_' + id);
    if (!input) return;
    input.addEventListener('input', () => {
      auditPerEventChannelsDraft[id] = input.value.trim();
    });
  });

  const closeBtn = document.getElementById('perEventChannelsClose');
  if (closeBtn) closeBtn.addEventListener('click', hideCustomModal);
  const saveBtn = document.getElementById('perEventChannelsSave');
  if (saveBtn) saveBtn.addEventListener('click', () => {
    Object.keys(auditEventLabels).forEach(id => {
      const input = document.getElementById('perEventChannel_' + id);
      if (input) auditPerEventChannelsDraft[id] = input.value.trim();
    });
    saveAuditLogSettings();
  });
}

function openPerEventPingsModal() {
  const rows = Object.entries(auditPingLabels).map(([id, label]) => {
    const value = Array.isArray(auditPerEventPingsDraft[id]) ? auditPerEventPingsDraft[id].join(' ') : (auditPerEventPingsDraft[id] || '');
    return '<div style="background:#23232b;padding:16px;border-radius:8px;margin-bottom:12px;border:1px solid #2f2f3a">'
      + '<label style="display:block;color:#b9bbbe;font-size:14px;font-weight:500;margin-bottom:10px">' + label + '</label>'
      + '<input type="text" id="perEventPing_' + id + '" value="' + value + '" placeholder="Enter Role/User IDs (space or comma separated)"'
      + ' style="background:#0f0f12;border:1px solid #3a3a42;border-radius:6px;padding:12px 14px;color:#ffffff;width:100%;box-sizing:border-box;font-size:14px;transition:border 0.2s" '
      + 'onfocus="this.style.borderColor=&#39;#9146ff&#39;" onblur="this.style.borderColor=&#39;#3a3a42&#39;" />'
      + '</div>';
  }).join('');

  const actionBar = '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">'
    + '<button type="button" id="perEventPingsClose" style="background:#3a3a42;color:#ffffff;border:1px solid #4a4a52;padding:10px 24px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500">Close</button>'
    + '<button type="button" id="perEventPingsSave" style="background:#9146ff;color:#ffffff;border:1px solid #9146ff;padding:10px 24px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500">Save Changes</button>'
    + '</div>';

  showCustomModal('<div><h3 style="margin:0 0 6px 0;font-size:18px;font-weight:600">Event Pings</h3>'
    + '<p style="color:#72767d;margin:0 0 20px 0;font-size:13px;line-height:1.5">Configure role or user mentions for specific audit events. Enter IDs separated by spaces or commas. Leave empty for no pings.</p>'
    + '<div style="max-height:450px;overflow-y:auto;padding-right:4px">' + rows + '</div>'
    + actionBar
    + '</div>');

  Object.keys(auditPingLabels).forEach(id => {
    const input = document.getElementById('perEventPing_' + id);
    if (!input) return;
    input.addEventListener('input', () => {
      auditPerEventPingsDraft[id] = splitIdTokens(input.value);
    });
  });

  const closeBtn = document.getElementById('perEventPingsClose');
  if (closeBtn) closeBtn.addEventListener('click', hideCustomModal);
  const saveBtn = document.getElementById('perEventPingsSave');
  if (saveBtn) saveBtn.addEventListener('click', () => {
    Object.keys(auditPingLabels).forEach(id => {
      const input = document.getElementById('perEventPing_' + id);
      if (input) auditPerEventPingsDraft[id] = splitIdTokens(input.value);
    });
    saveAuditLogSettings();
  });
}

function openLivePreviewModal() {
  const preview = document.getElementById('livePreviewContent');
  const html = preview ? preview.innerHTML : '<div style="color:#72767d;font-size:14px;padding:20px;text-align:center">Select events above to see preview...</div>';
  const actionBar = '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">'
    + '<button type="button" id="livePreviewClose" style="background:#3a3a42;color:#ffffff;border:1px solid #4a4a52;padding:10px 24px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500">Close</button>'
    + '</div>';
  showCustomModal('<div><h3 style="margin:0 0 6px 0;font-size:18px;font-weight:600">Live Preview</h3>'
    + '<p style="color:#72767d;margin:0 0 16px 0;font-size:13px">Preview of how your audit log messages will appear in the configured channel.</p>'
    + '<div style="background:#0f0f12;border:1px solid #2f2f3a;border-radius:8px;padding:16px;max-height:500px;overflow-y:auto">' + html + '</div>'
    + actionBar
    + '</div>');

  const closeBtn = document.getElementById('livePreviewClose');
  if (closeBtn) closeBtn.addEventListener('click', hideCustomModal);
}

function splitIdTokens(value) {
  const out = [];
  let buf = '';
  const text = value || '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ',' || ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r') {
      const trimmed = buf.trim();
      if (trimmed) out.push(trimmed);
      buf = '';
      continue;
    }
    buf += ch;
  }
  const last = buf.trim();
  if (last) out.push(last);
  return out;
}

function parseIdList(inputId) {
  const input = document.getElementById(inputId);
  const raw = input ? input.value : '';
  if (!raw || !raw.trim()) return [];
  const normalized = raw.split('\r').join('');
  const lines = normalized.split('\n');
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(',');
    for (let j = 0; j < parts.length; j++) {
      const trimmed = parts[j].trim();
      if (trimmed) result.push(trimmed);
    }
  }
  return result;
}

function saveAuditLogSettings() {
  const nameChangesChecked = document.getElementById('logUsernameChanges').checked;
  const bansChecked = document.getElementById('logMemberBans').checked;
  const joinsChecked = document.getElementById('logMemberJoins').checked;
  const deletesChecked = document.getElementById('logMessageDeletes').checked;

  const perEventChannels = {};
  const perEventPings = {};

  const channelInputs = document.querySelectorAll('[id^="perEventChannel_"]');
  if (channelInputs.length) {
    channelInputs.forEach(input => {
      const eventId = input.id.replace('perEventChannel_', '');
      const value = input.value.trim();
      if (value) perEventChannels[eventId] = value;
    });
  } else {
    Object.keys(auditPerEventChannelsDraft || {}).forEach(eventId => {
      const value = (auditPerEventChannelsDraft[eventId] || '').trim();
      if (value) perEventChannels[eventId] = value;
    });
  }

  const pingInputs = document.querySelectorAll('[id^="perEventPing_"]');
  if (pingInputs.length) {
    pingInputs.forEach(input => {
      const eventId = input.id.replace('perEventPing_', '');
      if (input.value.trim()) {
        perEventPings[eventId] = splitIdTokens(input.value);
      }
    });
  } else {
    Object.keys(auditPerEventPingsDraft || {}).forEach(eventId => {
      const list = Array.isArray(auditPerEventPingsDraft[eventId]) ? auditPerEventPingsDraft[eventId] : splitIdTokens(String(auditPerEventPingsDraft[eventId] || ''));
      if (list.length) perEventPings[eventId] = list;
    });
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
    warnNewAccounts: document.getElementById('warnNewAccounts').checked,
    newAccountThresholdDays: parseInt(document.getElementById('newAccountThresholdDays').value, 10) || 7,
    excludedChannels: parseIdList('excludedChannelsInput'),
    excludedRoles: parseIdList('excludedRolesInput'),
    excludedUsers: parseIdList('excludedUsersInput'),
    muteRoleIds: parseIdList('muteRoleIdsInput'),
    perEventChannels,
    perEventPings
  };

  fetch('/api/audit-log-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      alert('✅ Member log settings saved!');
      location.reload();
    } else {
      alert('❌ Error: ' + (data.error || 'Unknown error'));
    }
  })
  .catch(err => alert('❌ Error: ' + err.message));
}

function updateAuditChannelName() {
  const input = document.getElementById('auditChannelId');
  const label = document.getElementById('auditChannelName');
  if (!input || !label) return;
  const id = input.value.trim();
  if (!id) {
    label.textContent = 'Leave empty to disable logging';
    return;
  }
  fetch('/channel/info/' + id)
    .then(r => r.json())
    .then(data => {
      if (data && data.name) {
        label.textContent = 'Channel: #' + data.name + ' (' + id + ')';
      } else {
        label.textContent = 'Channel not found';
      }
    })
    .catch(() => {
      label.textContent = 'Channel lookup failed';
    });
}

function showLogPreview(type) {
  const previews = {
    memberJoins: 'User {user} joined the server. Example: "✅ User Antho joined the server (ID: 123)"',
    memberLeaves: 'User {user} left the server. Example: "❌ User Antho left the server (ID: 123)"',
    memberBans: 'User {user} was banned. Example: "⛔ User Antho banned (Reason: spam)"',
    memberUnbans: 'User {user} was unbanned. Example: "✅ User Antho unbanned"',
    memberTimeouts: 'User {user} timed out or timeout expired. Example: "⏱️ User Antho timed out (10m)"',
    memberMutes: 'Mute role added/removed. Example: "🔇 User Antho muted (Mute Role)"',
    memberBoosts: 'Boost started or ended. Example: "💜 User Antho started boosting"',
    joinPosition: 'Join position is recorded. Example: "#152 joined"',
    warnNew: 'New account detected: {user} created {age} days ago. Example: "⚠️ New account: User Antho (2 days old)"',
    username: 'Username changed from OldName to NewName. Example: "✏️ Username changed: OldName → NewName"',
    nickname: 'Nickname changed from OldNick to NewNick. Example: "✏️ Nickname changed: OldNick → NewNick"',
    avatar: 'Avatar changed. Example: "🖼️ Avatar updated for User Antho"',
    role: 'Roles updated: added @Mod, removed @Guest. Example: "🔧 Roles updated for User Antho: +@Mod -@Guest"',
    messageEdits: 'Message edited. Example: "✏️ Message edited by User Antho: before → after"',
    messageDeletes: 'Message deleted. Example: "🗑️ Message deleted in #general"',
    messageBulkDeletes: 'Bulk delete. Example: "🧹 25 messages deleted in #general"',
    messagePins: 'Message pinned/unpinned. Example: "📌 Message pinned by User Antho"',
    serverUpdates: 'Server settings updated. Example: "⚙️ Server name changed"',
    integrations: 'Integrations or bots updated. Example: "🔌 Integration added by Mod"'
  };

  const text = previews[type] || 'No preview available for this item.';
  if (typeof showCustomModal === 'function') {
    showCustomModal('<div style="padding:12px"><h3 style="margin-top:0">Preview</h3><div style="color:#ddd;font-size:13px;white-space:pre-wrap">' + text + '</div></div>');
  } else {
    alert(text);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const data = document.getElementById('auditLogData');
  if (data) {
    try {
      auditPerEventChannelsDraft = JSON.parse(data.getAttribute('data-per-event-channels') || '{}') || {};
    } catch {
      auditPerEventChannelsDraft = {};
    }
    try {
      auditPerEventPingsDraft = JSON.parse(data.getAttribute('data-per-event-pings') || '{}') || {};
    } catch {
      auditPerEventPingsDraft = {};
    }
  }
  if (document.getElementById('auditChannelId')) {
    updateAuditChannelName();
  }
  if (document.getElementById('livePreviewContent')) {
    updateLivePreview();
  }
  // Page access: disable inputs on read-only pages
  if (_hasCustomAccess) {
    // _curSlug is set in inline script block
    if (_pageAccessMap[_curSlug] === 'read') {
      document.querySelectorAll('.main input, .main select, .main textarea').forEach(function(el) {
        el.disabled = true;
        el.style.opacity = '0.6';
        el.style.cursor = 'not-allowed';
      });
      document.querySelectorAll('.main button, .main .btn').forEach(function(el) {
        if (el.closest('.topbar') || el.closest('.sidebar')) return;
        el.disabled = true;
        el.style.opacity = '0.5';
        el.style.cursor = 'not-allowed';
        el.style.pointerEvents = 'none';
      });
    }
  }
});
