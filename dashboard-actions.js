(function () {
  'use strict';

  window.giveawayRoleIds = window.giveawayRoleIds || [];
  window.giveawayExcludeIds = window.giveawayExcludeIds || [];

  function splitIdTokens(value) {
    var out = [];
    var buf = '';
    var text = value || '';
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ch === ',' || ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r') {
        var trimmed = buf.trim();
        if (trimmed) out.push(trimmed);
        buf = '';
        continue;
      }
      buf += ch;
    }
    var last = buf.trim();
    if (last) out.push(last);
    return out;
  }

  window.resolveGiveChannel = function () {
    var input = document.getElementById('giveChannel');
    var display = document.getElementById('giveChannelName');
    var channelId = input && input.value ? input.value.trim() : '';
    if (!display) return;
    if (!channelId) {
      display.textContent = '';
      return;
    }
    display.textContent = 'Loading...';
    fetch('/channel/info/' + channelId)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.name) {
          display.textContent = '✓ #' + data.name;
          display.style.color = '#57F287';
        } else {
          display.textContent = '✗ Channel not found';
          display.style.color = '#ED4245';
        }
      })
      .catch(function () {
        display.textContent = '✗ Error fetching channel';
        display.style.color = '#ED4245';
      });
  };

  window.resolveGivePingRole = function () {
    var input = document.getElementById('givePingRole');
    var display = document.getElementById('givePingRoleName');
    var roleId = input && input.value ? input.value.trim() : '';
    if (!display) return;
    if (!roleId) {
      display.textContent = '';
      return;
    }
    display.textContent = 'Loading...';
    fetch('/role/info/' + roleId)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.name) {
          display.textContent = '✓ @' + data.name;
          display.style.color = data.hexColor || '#57F287';
        } else {
          display.textContent = '✗ Role not found';
          display.style.color = '#ED4245';
        }
      })
      .catch(function () {
        display.textContent = '✗ Error fetching role';
        display.style.color = '#ED4245';
      });
  };

  window.startGiveaway = function () {
    var prize = (document.getElementById('givePrize') || {}).value || '';
    var duration = parseInt((document.getElementById('giveDuration') || {}).value, 10);
    var winnersCount = parseInt((document.getElementById('giveWinners') || {}).value || '1', 10) || 1;
    var channelId = (document.getElementById('giveChannel') || {}).value || '';
    var pingRoleId = (document.getElementById('givePingRole') || {}).value || '';
    var tag = (document.getElementById('giveTag') || {}).value || '';
    var imageUrl = (document.getElementById('giveImageUrl') || {}).value || '';
    var embedColor = (document.getElementById('giveEmbedColor') || {}).value || '';
    var minAccountAge = parseInt((document.getElementById('giveMinAccountAge') || {}).value || '0', 10) || 0;
    var minLevel = parseInt((document.getElementById('giveMinLevel') || {}).value || '0', 10) || 0;
    var minXp = parseInt((document.getElementById('giveMinXp') || {}).value || '0', 10) || 0;
    var createdBy = (document.getElementById('giveCreatedBy') || {}).value || '';
    var excludePrevWinners = !!(document.getElementById('giveExcludePrevWinners') || {}).checked;
    var excludeBots = !!(document.getElementById('giveExcludeBots') || {}).checked;
    var excludeStaffRolesRaw = (document.getElementById('giveExcludeStaffRoles') || {}).value || '';
    var excludeStaffRoleIds = excludeStaffRolesRaw ? splitIdTokens(excludeStaffRolesRaw) : [];

    prize = prize.trim();
    channelId = channelId.trim();
    pingRoleId = pingRoleId.trim();
    tag = tag.trim();
    imageUrl = imageUrl.trim();
    embedColor = embedColor.trim();
    createdBy = createdBy.trim();

    if (!prize || !duration) { alert('Fill all fields'); return; }

    fetch('/giveaway/start', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        prize: prize,
        durationMinutes: duration,
        channelId: channelId || null,
        pingRoleId: pingRoleId || null,
        allowedRoleIds: window.giveawayRoleIds || [],
        excludedUserIds: window.giveawayExcludeIds || [],
        imageUrl: imageUrl || null,
        embedColor: embedColor || null,
        tag: tag || null,
        winnersCount: winnersCount,
        minAccountAgeDays: minAccountAge,
        minLevel: minLevel,
        minXp: minXp,
        createdBy: createdBy || null,
        excludePreviousWinners: excludePrevWinners,
        excludeBots: excludeBots,
        excludeStaffRoleIds: excludeStaffRoleIds
      })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data && data.success) { alert('Giveaway started!'); location.reload(); }
      else { alert('Error: ' + (data.error || 'Unknown error')); }
    });
  };

  window.loadEligibleMembers = window.loadEligibleMembers || function () {};

  window.saveGiveawaySettings = function () {
    var input = document.getElementById('giveawayClaimContact');
    var value = input ? input.value.trim() : '';
    var defaultColor = (document.getElementById('giveawayDefaultColor') || {}).value || '';
    var logChannelId = (document.getElementById('giveawayLogChannelId') || {}).value || '';
    fetch('/giveaway/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        giveawayClaimContact: value,
        giveawayDefaultColor: (defaultColor || '').trim(),
        giveawayLogChannelId: (logChannelId || '').trim()
      })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data && data.success) {
        alert('Giveaway claim text saved!');
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    });
  };

  function populateTemplateSelect() {
    var select = document.getElementById('giveTemplateSelect');
    if (!select) return;
    fetch('/giveaway/templates')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        select.innerHTML = '<option value="">Select template</option>';
        (data.templates || []).forEach(function (t) {
          var opt = document.createElement('option');
          opt.value = t.name;
          opt.textContent = t.name;
          select.appendChild(opt);
        });
      });
  }

  window.saveGiveawayTemplate = function () {
    var name = (document.getElementById('giveTemplateName') || {}).value || '';
    name = name.trim();
    if (!name) { alert('Template name required'); return; }
    var template = {
      prize: (document.getElementById('givePrize') || {}).value || '',
      duration: parseInt((document.getElementById('giveDuration') || {}).value || '0', 10) || 0,
      winnersCount: parseInt((document.getElementById('giveWinners') || {}).value || '1', 10) || 1,
      channelId: (document.getElementById('giveChannel') || {}).value || '',
      pingRoleId: (document.getElementById('givePingRole') || {}).value || '',
      tag: (document.getElementById('giveTag') || {}).value || '',
      imageUrl: (document.getElementById('giveImageUrl') || {}).value || '',
      embedColor: (document.getElementById('giveEmbedColor') || {}).value || '',
      minAccountAgeDays: parseInt((document.getElementById('giveMinAccountAge') || {}).value || '0', 10) || 0,
      minLevel: parseInt((document.getElementById('giveMinLevel') || {}).value || '0', 10) || 0,
      minXp: parseInt((document.getElementById('giveMinXp') || {}).value || '0', 10) || 0,
      createdBy: (document.getElementById('giveCreatedBy') || {}).value || '',
      excludePreviousWinners: !!(document.getElementById('giveExcludePrevWinners') || {}).checked,
      excludeBots: !!(document.getElementById('giveExcludeBots') || {}).checked,
      excludeStaffRoleIds: ((document.getElementById('giveExcludeStaffRoles') || {}).value || '').trim(),
      allowedRoleIds: window.giveawayRoleIds || [],
      excludedUserIds: window.giveawayExcludeIds || []
    };
    fetch('/giveaway/templates/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, template: template })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data && data.success) {
        populateTemplateSelect();
        alert('Template saved');
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    });
  };

  window.loadGiveawayTemplate = function () {
    var select = document.getElementById('giveTemplateSelect');
    if (!select || !select.value) return;
    fetch('/giveaway/templates')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var t = (data.templates || []).find(function (x) { return x.name === select.value; });
        if (!t || !t.template) return;
        var tpl = t.template;
        if (document.getElementById('givePrize')) document.getElementById('givePrize').value = tpl.prize || '';
        if (document.getElementById('giveDuration')) document.getElementById('giveDuration').value = tpl.duration || 60;
        if (document.getElementById('giveWinners')) document.getElementById('giveWinners').value = tpl.winnersCount || 1;
        if (document.getElementById('giveChannel')) document.getElementById('giveChannel').value = tpl.channelId || '';
        if (document.getElementById('givePingRole')) document.getElementById('givePingRole').value = tpl.pingRoleId || '';
        if (document.getElementById('giveTag')) document.getElementById('giveTag').value = tpl.tag || '';
        if (document.getElementById('giveImageUrl')) document.getElementById('giveImageUrl').value = tpl.imageUrl || '';
        if (document.getElementById('giveEmbedColor')) document.getElementById('giveEmbedColor').value = tpl.embedColor || '';
        if (document.getElementById('giveMinAccountAge')) document.getElementById('giveMinAccountAge').value = tpl.minAccountAgeDays || '';
        if (document.getElementById('giveMinLevel')) document.getElementById('giveMinLevel').value = tpl.minLevel || '';
        if (document.getElementById('giveMinXp')) document.getElementById('giveMinXp').value = tpl.minXp || '';
        if (document.getElementById('giveCreatedBy')) document.getElementById('giveCreatedBy').value = tpl.createdBy || '';
        if (document.getElementById('giveExcludePrevWinners')) document.getElementById('giveExcludePrevWinners').checked = !!tpl.excludePreviousWinners;
        if (document.getElementById('giveExcludeBots')) document.getElementById('giveExcludeBots').checked = !!tpl.excludeBots;
        if (document.getElementById('giveExcludeStaffRoles')) document.getElementById('giveExcludeStaffRoles').value = tpl.excludeStaffRoleIds || '';

        window.giveawayRoleIds = Array.isArray(tpl.allowedRoleIds) ? tpl.allowedRoleIds.slice() : [];
        window.giveawayExcludeIds = Array.isArray(tpl.excludedUserIds) ? tpl.excludedUserIds.slice() : [];
        if (window.renderGiveawayRoleList) window.renderGiveawayRoleList();
        if (window.renderGiveawayExcludeList) window.renderGiveawayExcludeList();
      });
  };

  window.deleteGiveawayTemplate = function () {
    var select = document.getElementById('giveTemplateSelect');
    if (!select || !select.value) return;
    fetch('/giveaway/templates/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: select.value })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data && data.success) {
        populateTemplateSelect();
      }
    });
  };

  window.exportGiveawayWinners = function () {
    window.location.href = '/giveaway/export-winners';
  };

  window.pauseGiveaway = function (id) {
    fetch('/giveaway/pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data && data.success) location.reload();
      else alert('Error: ' + (data.error || 'Unknown error'));
    });
  };

  window.resumeGiveaway = function (id) {
    fetch('/giveaway/resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data && data.success) location.reload();
      else alert('Error: ' + (data.error || 'Unknown error'));
    });
  };

  window.showGiveawayInfo = function (giveawayId) {
    fetch('/giveaway/info/' + giveawayId)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data) { alert('Giveaway not found'); return; }

        var durationMinutes = (typeof data.duration === 'number' && !isNaN(data.duration))
          ? Math.round(data.duration / 60000)
          : null;

        var channelPromise = data.channelId
          ? fetch('/channel/info/' + data.channelId).then(function (r) { return r.json(); }).catch(function () { return null; })
          : Promise.resolve(null);

        var rolesPromise = (data.allowedRoleIds && data.allowedRoleIds.length > 0)
          ? Promise.all(data.allowedRoleIds.map(function (roleId) {
              return fetch('/role/info/' + roleId)
                .then(function (r) { return r.json(); })
                .then(function (role) { return { id: roleId, name: role && role.name ? role.name : null }; })
                .catch(function () { return { id: roleId, name: null }; });
            }))
          : Promise.resolve([]);

        Promise.all([channelPromise, rolesPromise]).then(function (results) {
          var channel = results[0];
          var roles = results[1];
          var info = 'Prize: ' + data.prize + '\n';
          info += 'Duration: ' + (durationMinutes === null ? 'N/A' : (durationMinutes + ' minutes')) + '\n';
          if (data.channelId) {
            var channelName = channel && channel.name ? ('#' + channel.name) : 'Unknown channel';
            info += 'Channel: ' + channelName + ' (ID: ' + data.channelId + ')\n';
          }
          if (data.pingRoleId) info += 'Ping Role: ' + data.pingRoleId + '\n';
          if (roles && roles.length > 0) {
            var roleList = roles.map(function (r) {
              return (r.name ? '@' + r.name : 'Unknown role') + ' (ID: ' + r.id + ')';
            }).join(', ');
            info += 'Eligible Roles: ' + roleList + '\n';
          }
          if (data.excludedUserIds && data.excludedUserIds.length > 0) {
            info += 'Excluded Users: ' + data.excludedUserIds.join(', ') + '\n';
          }
          info += 'Active: ' + (data.active ? 'Yes' : 'No') + '\n';
          info += 'Created: ' + new Date(data.endTime - (data.duration || 0)).toLocaleString();
          alert(info);
        });
      })
      .catch(function () { alert('Error loading giveaway info'); });
  };

  window.endGiveawayNow = function (id) {
    if (!confirm('End this giveaway now?')) return;
    fetch('/giveaway/end', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ id: id })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data.success) { alert('Giveaway ended!'); location.reload(); }
      else { alert('Error: ' + (data.error || 'Unknown error')); }
    });
  };

  window.rerollGiveaway = function (id) {
    if (!confirm('Reroll winners for this giveaway?')) return;
    fetch('/giveaway/reroll', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ id: id })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data.success) { alert('Giveaway rerolled!'); location.reload(); }
      else { alert('Error: ' + (data.error || 'Unknown error')); }
    });
  };

  window.showRemoveExclusionModal = function (giveawayId) {
    fetch('/giveaway/info/' + giveawayId)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.excludedUsers || data.excludedUsers.length === 0) {
          alert('No exclusions found');
          return;
        }

        var html = '<div style="background:#2f3136;padding:20px;border-radius:8px;max-width:400px">';
        html += '<h3 style="margin-top:0;color:#e0e0e0">Remove Exclusion</h3>';
        html += '<div style="margin:15px 0">';

        data.excludedUsers.forEach(function (user, index) {
          html += '<button data-remove-exclusion="' + user.id + '" data-giveaway-id="' + giveawayId + '" style="display:block;width:100%;margin:5px 0;background:#f04747;color:white;border:none;padding:8px;border-radius:4px;cursor:pointer;text-align:left">';
          html += '<span>' + (index + 1) + '. ' + user.name + ' (' + user.id + ')</span>';
          html += '</button>';
        });

        html += '</div><button onclick="closeModal()" style="width:100%;background:#3a3f4b;color:#e0e0e0;border:none;padding:8px;border-radius:4px;cursor:pointer;margin-top:10px">Cancel</button>';
        html += '</div>';

        showCustomModal(html);

        var buttons = document.querySelectorAll('[data-remove-exclusion]');
        buttons.forEach(function (btn) {
          btn.addEventListener('click', function () {
            var userId = btn.getAttribute('data-remove-exclusion');
            var gId = btn.getAttribute('data-giveaway-id');
            removeExclusionAction(gId, userId);
          });
        });
      })
      .catch(function () { alert('Error loading exclusions'); });
  };

  window.removeExclusionAction = function (giveawayId, userId) {
    fetch('/giveaway/exclusions/remove', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ id: giveawayId, userId: userId })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data && data.success) {
        closeModal();
        location.reload();
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    }).catch(function () { alert('Error removing exclusion'); });
  };

  window.showCustomModal = function (html) {
    var modal = document.getElementById('customModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'customModal';
      document.body.appendChild(modal);
    }
    modal.innerHTML = html;
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10000';
  };

  window.closeModal = function () {
    var modal = document.getElementById('customModal');
    if (modal) modal.remove();
  };

  var giveawayEntriesCache = new Map();

  function formatCountdown(ms) {
    if (ms <= 0) return 'Ended';
    var totalSec = Math.floor(ms / 1000);
    var days = Math.floor(totalSec / 86400);
    var hours = Math.floor((totalSec % 86400) / 3600);
    var mins = Math.floor((totalSec % 3600) / 60);
    var secs = totalSec % 60;
    var parts = [];
    if (days) parts.push(days + 'd');
    if (hours || days) parts.push(hours + 'h');
    parts.push(mins + 'm');
    parts.push(secs + 's');
    return 'Ends in ' + parts.join(' ');
  }

  function initGiveawayCountdowns() {
    var items = document.querySelectorAll('[data-giveaway-countdown]');
    if (!items.length) return;
    var tick = function () {
      items.forEach(function (el) {
        var endTime = Number(el.getAttribute('data-giveaway-countdown'));
        if (!endTime) return;
        el.textContent = formatCountdown(endTime - Date.now());
      });
    };
    tick();
    setInterval(tick, 1000);
  }

  function fetchGiveawayEntries(giveawayId) {
    var cached = giveawayEntriesCache.get(giveawayId);
    if (cached && (Date.now() - cached.ts) < 30000) {
      return Promise.resolve(cached.data);
    }
    return fetch('/giveaway/entries/' + giveawayId)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        giveawayEntriesCache.set(giveawayId, { ts: Date.now(), data: data });
        return data;
      });
  }

  function showEntriesModal(entries) {
    var list = entries.map(function (u) {
      return '<div style="margin:6px 0"><span>' + (u.name || 'Unknown') + '</span> <span style="color:#666">(' + u.id + ')</span></div>';
    }).join('');
    var html = '<div style="background:#2f3136;padding:20px;border-radius:8px;max-width:420px">'
      + '<h3 style="margin-top:0;color:#e0e0e0">Entries</h3>'
      + '<div style="max-height:240px;overflow:auto">' + (list || '<div style="color:#777">No entries</div>') + '</div>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">'
      + '<button id="copyGiveawayEntries" style="background:#9146ff;color:white;border:none;padding:6px 10px;border-radius:4px;cursor:pointer">Copy</button>'
      + '<button onclick="closeModal()" style="background:#3a3f4b;color:#e0e0e0;border:none;padding:6px 10px;border-radius:4px;cursor:pointer">Close</button>'
      + '</div></div>';
    window.__giveawayEntriesToCopy = entries;
    window.showCustomModal(html);
    var copyBtn = document.getElementById('copyGiveawayEntries');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var listText = (window.__giveawayEntriesToCopy || []).map(function (u) { return '<@' + u.id + '>'; }).join(', ');
        navigator.clipboard.writeText(listText).then(function () { alert('Copied entries!'); });
      });
    }
  }

  function showWinnersModal(winners) {
    var list = winners.map(function (id) {
      return '<div style="margin:6px 0"><span data-user-info="' + id + '">Loading...</span> <span style="color:#666">(' + id + ')</span></div>';
    }).join('');
    var html = '<div style="background:#2f3136;padding:20px;border-radius:8px;max-width:420px">'
      + '<h3 style="margin-top:0;color:#e0e0e0">Winners</h3>'
      + '<div style="max-height:240px;overflow:auto">' + list + '</div>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">'
      + '<button id="copyGiveawayWinners" style="background:#9146ff;color:white;border:none;padding:6px 10px;border-radius:4px;cursor:pointer">Copy</button>'
      + '<button onclick="closeModal()" style="background:#3a3f4b;color:#e0e0e0;border:none;padding:6px 10px;border-radius:4px;cursor:pointer">Close</button>'
      + '</div></div>';
    window.__giveawayWinnersToCopy = winners;
    window.showCustomModal(html);

    document.querySelectorAll('[data-user-info]').forEach(function (el) {
      var userId = el.getAttribute('data-user-info');
      fetch('/discord/user/' + userId)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          el.textContent = (data && (data.displayName || data.username)) ? (data.displayName || data.username) : 'Unknown user';
        })
        .catch(function () { el.textContent = 'Unknown user'; });
    });

    var copyBtn = document.getElementById('copyGiveawayWinners');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var listText = (window.__giveawayWinnersToCopy || []).map(function (id) { return '<@' + id + '>'; }).join(', ');
        navigator.clipboard.writeText(listText).then(function () { alert('Copied winners!'); });
      });
    }
  }

  window.pingGiveawayWinners = function (id) {
    fetch('/giveaway/ping-winners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data && data.success) alert('Winners pinged!');
      else alert('Error: ' + (data.error || 'Unknown error'));
    });
  };

  window.duplicateGiveawayPreset = function (id) {
    fetch('/giveaway/info/' + id)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data) return;
        var prize = document.getElementById('givePrize');
        var duration = document.getElementById('giveDuration');
        var channel = document.getElementById('giveChannel');
        var pingRole = document.getElementById('givePingRole');
        var tag = document.getElementById('giveTag');
        var prev = document.getElementById('giveExcludePrevWinners');
        var bots = document.getElementById('giveExcludeBots');
        var staff = document.getElementById('giveExcludeStaffRoles');

        if (prize) prize.value = data.prize || '';
        if (duration) duration.value = Math.round((data.duration || 0) / 60000) || 60;
        if (channel) channel.value = data.channelId || '';
        if (pingRole) pingRole.value = data.pingRoleId || '';
        if (tag) tag.value = data.tag || '';
        if (prev) prev.checked = !!data.excludePreviousWinners;
        if (bots) bots.checked = data.excludeBots !== false;
        if (staff) staff.value = (data.excludeStaffRoleIds || []).join(' ');

        if (window.giveawayRoleIds && Array.isArray(data.allowedRoleIds)) {
          window.giveawayRoleIds = data.allowedRoleIds.slice();
          if (window.renderGiveawayRoleList) window.renderGiveawayRoleList();
        }
        if (window.giveawayExcludeIds && Array.isArray(data.excludedUserIds)) {
          window.giveawayExcludeIds = data.excludedUserIds.slice();
          if (window.renderGiveawayExcludeList) window.renderGiveawayExcludeList();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
  };

  window.archiveGiveaway = function (id) {
    if (!confirm('Archive this giveaway?')) return;
    fetch('/giveaway/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data && data.success) location.reload();
      else alert('Error: ' + (data.error || 'Unknown error'));
    });
  };

  window.deleteGiveaway = function (id) {
    if (!confirm('Delete this giveaway permanently?')) return;
    fetch('/giveaway/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data && data.success) location.reload();
      else alert('Error: ' + (data.error || 'Unknown error'));
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    var infoEls = document.querySelectorAll('[data-user-info]');
    infoEls.forEach(function (el) {
      var userId = el.getAttribute('data-user-info');
      if (!userId) return;
      fetch('/discord/user/' + userId)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          el.textContent = (data && (data.displayName || data.username))
            ? (data.displayName || data.username)
            : 'Unknown user';
        })
        .catch(function () {
          el.textContent = 'Unknown user';
        });
    });

    initGiveawayCountdowns();
    populateTemplateSelect();

    document.addEventListener('click', function (e) {
      var winnersBtn = e.target.closest('[data-giveaway-winners]');
      if (winnersBtn) {
        e.preventDefault();
        var giveawayId = winnersBtn.getAttribute('data-giveaway-winners');
        fetch('/giveaway/info/' + giveawayId)
          .then(function (r) { return r.json(); })
          .then(function (data) {
            var winners = Array.isArray(data && data.winners) ? data.winners : [];
            showWinnersModal(winners);
          });
        return;
      }

      var entriesBtn = e.target.closest('[data-giveaway-entries]');
      if (entriesBtn) {
        e.preventDefault();
        var gId = entriesBtn.getAttribute('data-giveaway-entries');
        entriesBtn.textContent = '...';
        fetchGiveawayEntries(gId)
          .then(function (data) {
            if (data && Array.isArray(data.entries)) {
              entriesBtn.textContent = data.entries.length;
              showEntriesModal(data.entries);
            } else {
              entriesBtn.textContent = '0';
            }
          })
          .catch(function () { entriesBtn.textContent = '0'; });
      }
    });

    var cmdSearchEl = document.getElementById('cmdSearch');
    var cmdStatusEl = document.getElementById('cmdFilterStatus');
    var cmdTagEl = document.getElementById('cmdFilterTag');
    var cmdSortEl = document.getElementById('cmdSort');

    function applyCommandFilters() {
      if (!cmdSearchEl) return;
      var rows = Array.prototype.slice.call(document.querySelectorAll('tr[data-cmd-name]'));
      if (!rows.length) return;

      var term = (cmdSearchEl.value || '').toLowerCase().trim();
      var tagTerm = (cmdTagEl && cmdTagEl.value ? cmdTagEl.value : '').toLowerCase().trim();
      var status = (cmdStatusEl && cmdStatusEl.value ? cmdStatusEl.value : '').toLowerCase().trim();
      var sort = (cmdSortEl && cmdSortEl.value ? cmdSortEl.value : 'name').toLowerCase();

      rows.forEach(function (row) {
        var name = (row.getAttribute('data-cmd-name') || '').toLowerCase();
        var tags = (row.getAttribute('data-cmd-tags') || '').toLowerCase();
        var category = (row.getAttribute('data-cmd-category') || '').toLowerCase();
        var rowStatus = (row.getAttribute('data-cmd-status') || '').toLowerCase();

        var matchesTerm = !term || name.indexOf(term) !== -1 || tags.indexOf(term) !== -1 || category.indexOf(term) !== -1;
        var matchesTag = !tagTerm || tags.indexOf(tagTerm) !== -1;
        var matchesStatus = !status || rowStatus === status;

        row.style.display = (matchesTerm && matchesTag && matchesStatus) ? '' : 'none';
      });

      rows.sort(function (a, b) {
        if (sort === 'uses') {
          var ua = parseInt(a.getAttribute('data-cmd-uses') || '0', 10);
          var ub = parseInt(b.getAttribute('data-cmd-uses') || '0', 10);
          return ub - ua;
        }
        var na = (a.getAttribute('data-cmd-name') || '').toLowerCase();
        var nb = (b.getAttribute('data-cmd-name') || '').toLowerCase();
        return na.localeCompare(nb);
      });

      var parent = rows[0].parentElement;
      rows.forEach(function (row) { parent.appendChild(row); });
    }

    if (cmdSearchEl) cmdSearchEl.addEventListener('input', applyCommandFilters);
    if (cmdStatusEl) cmdStatusEl.addEventListener('change', applyCommandFilters);
    if (cmdTagEl) cmdTagEl.addEventListener('input', applyCommandFilters);
    if (cmdSortEl) cmdSortEl.addEventListener('change', applyCommandFilters);

    applyCommandFilters();
  });

  window.addCustomCommand = function () {
    var nameEl = document.getElementById('cmdName');
    var respEl = document.getElementById('cmdResponse');
    var imageUrlEl = document.getElementById('cmdImageUrl');
    var autoDeleteUsesEl = document.getElementById('cmdAutoDeleteUses');
    var autoDeleteDelayEl = document.getElementById('cmdAutoDeleteDelay');
    var cooldownEl = document.getElementById('cmdCooldown');
    var allowedRolesEl = document.getElementById('cmdAllowedRoles');
    var allowedChannelsEl = document.getElementById('cmdAllowedChannels');
    var categoryEl = document.getElementById('cmdCategory');
    var tagsEl = document.getElementById('cmdTags');
    var embedEl = document.getElementById('cmdEmbed');
    var editingIndexEl = document.getElementById('editingIndex');
    if (!nameEl || !respEl) return;
    var name = nameEl.value.trim();
    var response = respEl.value.trim();
    var imageUrl = imageUrlEl ? imageUrlEl.value.trim() : '';
    var autoDeleteAfterUses = autoDeleteUsesEl ? autoDeleteUsesEl.value.trim() : '';
    var autoDeleteDelaySeconds = autoDeleteDelayEl ? autoDeleteDelayEl.value.trim() : '';
    var cooldownSeconds = cooldownEl ? cooldownEl.value.trim() : '';
    var allowedRoleIds = allowedRolesEl ? allowedRolesEl.value.trim() : '';
    var allowedChannelIds = allowedChannelsEl ? allowedChannelsEl.value.trim() : '';
    var category = categoryEl ? categoryEl.value.trim() : '';
    var tags = tagsEl ? tagsEl.value.trim() : '';
    var sendAsEmbed = embedEl ? !!embedEl.checked : true;
    if (!name || !response) { alert('Fill all fields'); return; }

    var editingIndex = editingIndexEl ? parseInt(editingIndexEl.value) : -1;

    // If editing mode, update the command
    if (editingIndex >= 0) {
      fetch('/customcmd/update', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          index: editingIndex,
          name: name,
          response: response,
          imageUrl: imageUrl,
          autoDeleteAfterUses: autoDeleteAfterUses,
          autoDeleteDelaySeconds: autoDeleteDelaySeconds,
          cooldownSeconds: cooldownSeconds,
          allowedRoleIds: allowedRoleIds ? allowedRoleIds.split(/[\s,]+/).filter(Boolean) : [],
          allowedChannelIds: allowedChannelIds ? allowedChannelIds.split(/[\s,]+/).filter(Boolean) : [],
          category: category,
          tags: tags ? tags.split(',').map(function (t) { return t.trim(); }).filter(Boolean) : [],
          sendAsEmbed: sendAsEmbed
        })
      }).then(function (r) { return r.json(); }).then(function (data) {
        if (data.success) {
          location.reload();
        } else {
          alert(data.error || 'Failed to update');
        }
      });
      return;
    }

    // Otherwise, add new command
    var names = [];
    name.split(',').forEach(function (part) {
      part.split('\n').forEach(function (p) {
        var t = (p || '').trim();
        if (t) names.push(t);
      });
    });

    if (names.length === 0) { alert('Enter at least one command'); return; }

    fetch('/customcmd/add', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        names: names,
        response: response,
        imageUrl: imageUrl,
        autoDeleteAfterUses: autoDeleteAfterUses,
        autoDeleteDelaySeconds: autoDeleteDelaySeconds,
        cooldownSeconds: cooldownSeconds,
        allowedRoleIds: allowedRoleIds ? allowedRoleIds.split(/[\s,]+/).filter(Boolean) : [],
        allowedChannelIds: allowedChannelIds ? allowedChannelIds.split(/[\s,]+/).filter(Boolean) : [],
        category: category,
        tags: tags ? tags.split(',').map(function (t) { return t.trim(); }).filter(Boolean) : [],
        sendAsEmbed: sendAsEmbed
      })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data.success) {
        if (data.skipped && data.skipped.length > 0) {
          alert('Added: ' + (data.added || 0) + '\nSkipped (already exist): ' + data.skipped.join(', '));
        }
        location.reload();
      } else {
        alert(data.error || 'Failed');
      }
    });
  };

  window.editCommand = function (index) {
    fetch('/customcmd/get/' + index)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.command) { alert('Command not found'); return; }
        
        var nameEl = document.getElementById('cmdName');
        var respEl = document.getElementById('cmdResponse');
        var imageUrlEl = document.getElementById('cmdImageUrl');
        var autoDeleteUsesEl = document.getElementById('cmdAutoDeleteUses');
        var autoDeleteDelayEl = document.getElementById('cmdAutoDeleteDelay');
        var cooldownEl = document.getElementById('cmdCooldown');
        var allowedRolesEl = document.getElementById('cmdAllowedRoles');
        var allowedChannelsEl = document.getElementById('cmdAllowedChannels');
        var categoryEl = document.getElementById('cmdCategory');
        var tagsEl = document.getElementById('cmdTags');
        var embedEl = document.getElementById('cmdEmbed');
        var editingIndexEl = document.getElementById('editingIndex');
        var addBtn = document.getElementById('addCommandBtn');
        var cancelBtn = document.getElementById('cancelEditBtn');
        
        if (nameEl) nameEl.value = data.command.name;
        if (respEl) respEl.value = data.command.response;
        if (imageUrlEl) imageUrlEl.value = data.command.imageUrl || '';
        if (autoDeleteUsesEl) autoDeleteUsesEl.value = data.command.autoDeleteAfterUses || '';
        if (autoDeleteDelayEl) autoDeleteDelayEl.value = data.command.autoDeleteDelayMs ? Math.round(data.command.autoDeleteDelayMs / 1000) : '';
        if (cooldownEl) cooldownEl.value = data.command.cooldownMs ? Math.round(data.command.cooldownMs / 1000) : '';
        if (allowedRolesEl) allowedRolesEl.value = (data.command.allowedRoleIds || []).join(' ');
        if (allowedChannelsEl) allowedChannelsEl.value = (data.command.allowedChannelIds || []).join(' ');
        if (categoryEl) categoryEl.value = data.command.category || '';
        if (tagsEl) tagsEl.value = (data.command.tags || []).join(', ');
        if (embedEl) embedEl.checked = data.command.sendAsEmbed !== false;
        if (editingIndexEl) editingIndexEl.value = index;
        if (addBtn) addBtn.textContent = 'Update Command';
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(function () { alert('Error loading command'); });
  };

  window.cancelEdit = function () {
    var nameEl = document.getElementById('cmdName');
    var respEl = document.getElementById('cmdResponse');
    var imageUrlEl = document.getElementById('cmdImageUrl');
    var autoDeleteUsesEl = document.getElementById('cmdAutoDeleteUses');
    var autoDeleteDelayEl = document.getElementById('cmdAutoDeleteDelay');
    var cooldownEl = document.getElementById('cmdCooldown');
    var allowedRolesEl = document.getElementById('cmdAllowedRoles');
    var allowedChannelsEl = document.getElementById('cmdAllowedChannels');
    var categoryEl = document.getElementById('cmdCategory');
    var tagsEl = document.getElementById('cmdTags');
    var embedEl = document.getElementById('cmdEmbed');
    var editingIndexEl = document.getElementById('editingIndex');
    var addBtn = document.getElementById('addCommandBtn');
    var cancelBtn = document.getElementById('cancelEditBtn');
    
    if (nameEl) nameEl.value = '';
    if (respEl) respEl.value = '';
    if (imageUrlEl) imageUrlEl.value = '';
    if (autoDeleteUsesEl) autoDeleteUsesEl.value = '';
    if (autoDeleteDelayEl) autoDeleteDelayEl.value = '';
    if (cooldownEl) cooldownEl.value = '';
    if (allowedRolesEl) allowedRolesEl.value = '';
    if (allowedChannelsEl) allowedChannelsEl.value = '';
    if (categoryEl) categoryEl.value = '';
    if (tagsEl) tagsEl.value = '';
    if (embedEl) embedEl.checked = true;
    if (editingIndexEl) editingIndexEl.value = '-1';
    if (addBtn) addBtn.textContent = 'Add Command';
    if (cancelBtn) cancelBtn.style.display = 'none';
  };

  window.deleteCommand = function (id) {
    if (!confirm('Delete this command?')) return;
    fetch('/customcmd/delete', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ id: id })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data.success) location.reload();
      else alert(data.error || 'Failed');
    });
  };

  window.toggleCommand = function (id) {
    fetch('/customcmd/toggle', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ id: id })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data.success) location.reload();
      else alert(data.error || 'Failed');
    });
  };

  window.previewCommand = function (id) {
    fetch('/customcmd/get/' + id)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.command) return;
        var cmd = data.command;
        var content = cmd.response || '';
        if (Array.isArray(content)) content = content.join('\n');
        var html = '<div style="background:#2f3136;padding:20px;border-radius:8px;max-width:500px">'
          + '<h3 style="margin-top:0;color:#e0e0e0">Preview: !' + cmd.name + '</h3>'
          + '<div style="background:#1f1f23;border-radius:6px;padding:12px;color:#e0e0e0;white-space:pre-wrap">' + content + '</div>'
          + (cmd.imageUrl ? '<img src="' + cmd.imageUrl + '" style="max-width:100%;margin-top:10px;border-radius:6px">' : '')
          + '<div style="display:flex;justify-content:flex-end;margin-top:12px"><button onclick="closeModal()" style="background:#3a3f4b;color:#e0e0e0;border:none;padding:6px 10px;border-radius:4px;cursor:pointer">Close</button></div>'
          + '</div>';
        showCustomModal(html);
      });
  };

  window.copyCommandResponse = function (id) {
    fetch('/customcmd/get/' + id)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.command && data.command.response) {
          var textToCopy = data.command.response;
          var allLines = [];
          var linkLines = [];
          
          // Parse multiple lines if they exist
          if (typeof textToCopy === 'string' && textToCopy.includes('\n')) {
            allLines = textToCopy.split('\n').filter(function(l) { return l.trim(); });
          } else {
            allLines = [textToCopy];
          }
          
          // Extract URLs and handle multi-line URLs
          var i = 0;
          while (i < allLines.length) {
            var line = allLines[i];
            var trimmed = line.trim().toLowerCase();
            
            // Check if line contains a URL
            if (trimmed.includes('https:') || trimmed.includes('http:')) {
              // Extract from the https/http part onwards
              var urlStart = line.toLowerCase().indexOf('https:');
              if (urlStart === -1) urlStart = line.toLowerCase().indexOf('http:');
              
              var currentUrl = line.substring(urlStart);
              i++;
              
              // Check if next lines are continuations (don't contain "http" and don't look like descriptions)
              while (i < allLines.length) {
                var nextLine = allLines[i];
                var nextTrimmed = nextLine.trim().toLowerCase();
                
                // Stop if next line has a URL
                if (nextTrimmed.includes('https:') || nextTrimmed.includes('http:')) {
                  break;
                }
                
              // Check if next line looks like a description (has multiple spaces AND capital letters - natural language)
                var wordCount = nextLine.trim().split(/\s+/).length;
                var hasCapitals = /[A-Z]/.test(nextLine);
                // Only break if it looks like a real sentence/description (multiple words AND capitals)
                // Single words/parameters with no capitals are URL continuations
                if (wordCount > 1 && hasCapitals) {
                  break;
                }
                
                // Otherwise, treat as continuation
                currentUrl += nextLine.trim();
                i++;
              }
              
              linkLines.push(currentUrl);
            } else {
              i++;
            }
          }
          
          // If no links found, use all lines
          if (linkLines.length === 0) {
            linkLines = allLines;
          }
          
          // If only one response, just copy it directly
          if (linkLines.length === 1) {
            copyToClipboard(linkLines[0], function() {
              alert('✅ Copied to clipboard!');
            });
            return;
          }
          
          // Multiple responses - show popup
          showCopyPopup(linkLines, data.command.name);
        } else {
          alert('Command not found');
        }
      })
      .catch(function () { alert('Error loading command'); });
  };
  
  function showCopyPopup(lines, commandName) {
    // Create overlay
    var overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0, 0, 0, 0.7)';
    overlay.style.zIndex = '10000';
    overlay.id = 'copyPopupOverlay';
    
    // Create popup container
    var popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.width = '90%';
    popup.style.maxWidth = '600px';
    popup.style.maxHeight = '80vh';
    popup.style.background = '#1f1f23';
    popup.style.borderRadius = '8px';
    popup.style.border = '2px solid #9146ff';
    popup.style.zIndex = '10001';
    popup.style.display = 'flex';
    popup.style.flexDirection = 'column';
    
    // Header
    var header = document.createElement('div');
    header.style.padding = '15px 20px';
    header.style.background = '#9146ff';
    header.style.color = '#fff';
    header.style.borderRadius = '6px 6px 0 0';
    header.style.fontWeight = 'bold';
    header.style.fontSize = '16px';
    header.innerHTML = '📋 Copy Responses - !' + (commandName || 'command');
    
    // Content area
    var content = document.createElement('div');
    content.style.padding = '15px 20px';
    content.style.overflowY = 'auto';
    content.style.flex = '1';
    content.style.minHeight = '0';
    
    // Add each link/response
    lines.forEach(function(line, index) {
      var item = document.createElement('div');
      item.style.marginBottom = '10px';
      item.style.padding = '12px';
      item.style.background = '#2a2a2e';
      item.style.borderRadius = '6px';
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.gap = '10px';
      
      var number = document.createElement('span');
      number.style.color = '#9146ff';
      number.style.fontWeight = 'bold';
      number.style.fontSize = '18px';
      number.style.minWidth = '35px';
      number.textContent = (index + 1) + '.';
      
      var text = document.createElement('div');
      text.style.flex = '1';
      text.style.color = '#e0e0e0';
      text.style.fontSize = '20px';
      text.style.wordBreak = 'break-all';
      text.style.fontFamily = 'monospace';
      text.textContent = line;
      
      var copyBtn = document.createElement('button');
      copyBtn.textContent = '📋';
      copyBtn.style.padding = '3px 5px';
      copyBtn.style.background = '#5865f2';
      copyBtn.style.color = '#fff';
      copyBtn.style.border = 'none';
      copyBtn.style.borderRadius = '4px';
      copyBtn.style.cursor = 'pointer';
      copyBtn.style.fontSize = '10px';
      copyBtn.style.minWidth = '10px';
      copyBtn.style.width = '28px';
      copyBtn.title = 'Copy this response';
      copyBtn.onclick = function() {
        copyToClipboard(line, function() {
          var original = copyBtn.textContent;
          copyBtn.textContent = '✅';
          copyBtn.style.background = '#57f287';
          setTimeout(function() {
            copyBtn.textContent = original;
            copyBtn.style.background = '#5865f2';
          }, 1500);
        });
      };
      
      item.appendChild(number);
      item.appendChild(text);
      item.appendChild(copyBtn);
      content.appendChild(item);
    });
    
    // Footer with buttons
    var footer = document.createElement('div');
    footer.style.padding = '15px 20px';
    footer.style.borderTop = '1px solid #3a3a42';
    footer.style.display = 'flex';
    footer.style.gap = '10px';
    footer.style.justifyContent = 'flex-end';
    
    var copyAllBtn = document.createElement('button');
    copyAllBtn.textContent = '📋 Copy All';
    copyAllBtn.style.padding = '8px 16px';
    copyAllBtn.style.background = '#57f287';
    copyAllBtn.style.color = '#000';
    copyAllBtn.style.border = 'none';
    copyAllBtn.style.borderRadius = '4px';
    copyAllBtn.style.cursor = 'pointer';
    copyAllBtn.style.fontSize = '14px';
    copyAllBtn.style.fontWeight = '600';
    copyAllBtn.onclick = function() {
      var allText = lines.join('\n');
      copyToClipboard(allText, function() {
        var original = copyAllBtn.textContent;
        copyAllBtn.textContent = '✅ Copied ' + lines.length + ' responses!';
        copyAllBtn.style.background = '#3ba55c';
        setTimeout(function() {
          copyAllBtn.textContent = original;
          copyAllBtn.style.background = '#57f287';
        }, 2000);
      });
    };
    
    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.padding = '8px 16px';
    closeBtn.style.background = '#ed4245';
    closeBtn.style.color = '#fff';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '4px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '14px';
    closeBtn.style.fontWeight = '500';
    closeBtn.onclick = closeCopyPopup;
    
    footer.appendChild(copyAllBtn);
    footer.appendChild(closeBtn);
    
    // Assemble popup
    popup.appendChild(header);
    popup.appendChild(content);
    popup.appendChild(footer);
    
    // Close on overlay click
    overlay.onclick = function(e) {
      if (e.target === overlay) closeCopyPopup();
    };
    
    // Add to DOM
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
  }
  
  function closeCopyPopup() {
    var overlay = document.getElementById('copyPopupOverlay');
    if (overlay) overlay.remove();
    var popups = document.querySelectorAll('[style*="z-index: 10001"]');
    popups.forEach(function(p) { p.remove(); });
  }
  
  function copyToClipboard(text, callback) {
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(function() {
          if (callback) callback();
        })
        .catch(function() {
          // Fallback to execCommand
          copyWithExecCommand(text);
          if (callback) callback();
        });
    } else {
      // Fallback for older browsers
      copyWithExecCommand(text);
      if (callback) callback();
    }
  }
  
  function copyWithExecCommand(text) {
    var temp = document.createElement('textarea');
    temp.value = text;
    temp.style.position = 'fixed';
    temp.style.opacity = '0';
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    document.body.removeChild(temp);
  }

  window.showFullResponse = function (id) {
    fetch('/customcmd/get/' + id)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.command) {
          var infoHeader = document.createElement('div');
          infoHeader.style.position = 'fixed';
          infoHeader.style.top = 'calc(50% - 140px)';
          infoHeader.style.left = '50%';
          infoHeader.style.transform = 'translateX(-50%)';
          infoHeader.style.width = '80%';
          infoHeader.style.maxWidth = '600px';
          infoHeader.style.padding = '12px 15px';
          infoHeader.style.background = '#9146ff';
          infoHeader.style.color = '#fff';
          infoHeader.style.border = '2px solid #9146ff';
          infoHeader.style.borderRadius = '8px 8px 0 0';
          infoHeader.style.fontSize = '16px';
          infoHeader.style.fontWeight = 'bold';
          infoHeader.style.zIndex = '10000';
          infoHeader.style.margin = '0';
          infoHeader.innerHTML = 'ℹ️ Command Info: <span style="font-family:monospace">' + data.command.name + '</span>';
          
          var statsDiv = document.createElement('div');
          statsDiv.style.position = 'fixed';
          statsDiv.style.top = 'calc(50% - 104px)';
          statsDiv.style.left = '50%';
          statsDiv.style.transform = 'translateX(-50%)';
          statsDiv.style.width = '80%';
          statsDiv.style.maxWidth = '600px';
          statsDiv.style.padding = '10px 15px';
          statsDiv.style.background = '#26262c';
          statsDiv.style.color = '#b0b0b0';
          statsDiv.style.border = '2px solid #9146ff';
          statsDiv.style.borderTop = 'none';
          statsDiv.style.fontSize = '13px';
          statsDiv.style.zIndex = '10000';
          statsDiv.style.margin = '0';
          var pictureInfo = data.command.imageUrl ? ' | <strong style="color:#9146ff">Picture:</strong> <span style="color:#57f287">On</span>' : '';
          var autoDeleteUses = data.command.autoDeleteAfterUses ? ' | <strong style="color:#9146ff">Auto-delete:</strong> ' + data.command.autoDeleteAfterUses + ' uses' : '';
          var autoDeleteDelay = data.command.autoDeleteDelayMs ? ' | <strong style="color:#9146ff">Reply delete:</strong> ' + Math.round(data.command.autoDeleteDelayMs / 1000) + 's' : '';
          var cooldownInfo = data.command.cooldownMs ? ' | <strong style="color:#9146ff">Cooldown:</strong> ' + Math.round(data.command.cooldownMs / 1000) + 's' : '';
          var categoryInfo = data.command.category ? ' | <strong style="color:#9146ff">Category:</strong> ' + data.command.category : '';
          var tagsInfo = (data.command.tags && data.command.tags.length) ? ' | <strong style="color:#9146ff">Tags:</strong> ' + data.command.tags.join(', ') : '';
          var roleInfo = (data.command.allowedRoleIds && data.command.allowedRoleIds.length) ? ' | <strong style="color:#9146ff">Roles:</strong> ' + data.command.allowedRoleIds.length : '';
          var channelInfo = (data.command.allowedChannelIds && data.command.allowedChannelIds.length) ? ' | <strong style="color:#9146ff">Channels:</strong> ' + data.command.allowedChannelIds.length : '';
          statsDiv.innerHTML = '<strong style="color:#9146ff">Total Uses:</strong> ' + (data.command.uses || 0) + ' | <strong style="color:#9146ff">Status:</strong> ' + (data.command.paused ? '<span style="color:#ed4245">Paused</span>' : '<span style="color:#57f287">Active</span>') + pictureInfo + autoDeleteUses + autoDeleteDelay + cooldownInfo + categoryInfo + tagsInfo + roleInfo + channelInfo;
          
          var usageDiv = document.createElement('div');
          usageDiv.style.position = 'fixed';
          usageDiv.style.top = 'calc(50% - 70px)';
          usageDiv.style.left = '50%';
          usageDiv.style.transform = 'translateX(-50%)';
          usageDiv.style.width = '80%';
          usageDiv.style.maxWidth = '600px';
          usageDiv.style.padding = '10px 15px';
          usageDiv.style.background = '#1f1f23';
          usageDiv.style.color = '#b0b0b0';
          usageDiv.style.border = '2px solid #9146ff';
          usageDiv.style.borderTop = 'none';
          usageDiv.style.borderRadius = '0 0 8px 8px';
          usageDiv.style.fontSize = '12px';
          usageDiv.style.zIndex = '10000';
          usageDiv.style.maxHeight = '150px';
          usageDiv.style.overflowY = 'auto';
          usageDiv.style.margin = '0';
          
          if (data.usageHistory && data.usageHistory.length > 0) {
            var usageHTML = '<strong style="color:#9146ff">📊 Recent Usage:</strong><br>';
            data.usageHistory.forEach(function(usage, idx) {
              var timeAgo = new Date(usage.timestamp).toLocaleString();
              usageHTML += '<div style="margin-top:4px;padding:4px 0;border-bottom:1px solid #2a2a2e">';
              usageHTML += '<span style="color:#e0e0e0">' + (usage.displayName || usage.username) + '</span> ';
              usageHTML += '<span style="color:#888;font-size:11px">(ID: ' + usage.userId + ')</span><br>';
              usageHTML += '<span style="color:#666;font-size:11px">' + timeAgo + '</span>';
              usageHTML += '</div>';
            });
            usageDiv.innerHTML = usageHTML;
          } else {
            usageDiv.innerHTML = '<span style="color:#666">📊 Recent Usage: <span style="color:#888">No usage history yet</span></span>';
          }
          
          var overlay = document.createElement('div');
          overlay.style.position = 'fixed';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.width = '100%';
          overlay.style.height = '100%';
          overlay.style.background = 'rgba(0, 0, 0, 0.7)';
          overlay.style.zIndex = '9999';
          overlay.onclick = function() {
            document.body.removeChild(infoHeader);
            document.body.removeChild(statsDiv);
            document.body.removeChild(usageDiv);
            document.body.removeChild(overlay);
            document.body.removeChild(btnContainer);
          };
          
          var btnContainer = document.createElement('div');
          btnContainer.style.position = 'fixed';
          btnContainer.style.top = 'calc(50% + 100px)';
          btnContainer.style.left = '50%';
          btnContainer.style.transform = 'translateX(-50%)';
          btnContainer.style.display = 'flex';
          btnContainer.style.gap = '10px';
          btnContainer.style.zIndex = '10001';
          
          var closeBtn = document.createElement('button');
          closeBtn.textContent = 'Close';
          closeBtn.style.padding = '6px 16px';
          closeBtn.style.background = '#ed4245';
          closeBtn.style.color = '#fff';
          closeBtn.style.border = 'none';
          closeBtn.style.borderRadius = '4px';
          closeBtn.style.cursor = 'pointer';
          closeBtn.style.fontSize = '13px';
          closeBtn.style.fontWeight = '500';
          closeBtn.onclick = function() {
            document.body.removeChild(infoHeader);
            document.body.removeChild(statsDiv);
            document.body.removeChild(usageDiv);
            document.body.removeChild(overlay);
            document.body.removeChild(btnContainer);
          };
          
          btnContainer.appendChild(closeBtn);
          
          document.body.appendChild(overlay);
          document.body.appendChild(infoHeader);
          document.body.appendChild(statsDiv);
          document.body.appendChild(usageDiv);
          document.body.appendChild(btnContainer);
        } else {
          alert('Command not found');
        }
      })
      .catch(function () { alert('Error loading command'); });
  };

  // Image upload drag and drop
  window.addEventListener('DOMContentLoaded', function() {
    var dropZone = document.getElementById('imageDropZone');
    var fileInput = document.getElementById('imageFileInput');
    var urlInput = document.getElementById('cmdImageUrl');
    var preview = document.getElementById('imagePreview');
    var previewImg = document.getElementById('previewImg');

    if (!dropZone || !fileInput) return;

    // Click to browse
    dropZone.addEventListener('click', function(e) {
      if (e.target.id !== 'cmdImageUrl') {
        fileInput.click();
      }
    });

    // File input change
    fileInput.addEventListener('change', function(e) {
      if (e.target.files && e.target.files[0]) {
        uploadImage(e.target.files[0]);
      }
    });

    // Drag and drop
    dropZone.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.stopPropagation();
      dropZone.style.background = '#3a3a42';
      dropZone.style.borderColor = '#fff';
    });

    dropZone.addEventListener('dragleave', function(e) {
      e.preventDefault();
      e.stopPropagation();
      dropZone.style.background = '#2a2a2e';
      dropZone.style.borderColor = '#9146ff';
    });

    dropZone.addEventListener('drop', function(e) {
      e.preventDefault();
      e.stopPropagation();
      dropZone.style.background = '#2a2a2e';
      dropZone.style.borderColor = '#9146ff';

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        uploadImage(e.dataTransfer.files[0]);
      }
    });

    // URL input change - show preview
    if (urlInput) {
      urlInput.addEventListener('input', function() {
        if (urlInput.value.trim()) {
          previewImg.src = urlInput.value;
          preview.style.display = 'block';
        } else {
          preview.style.display = 'none';
        }
      });
    }

    function uploadImage(file) {
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      var formData = new FormData();
      formData.append('image', file);

      fetch('/upload/image', {
        method: 'POST',
        body: formData
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.success && data.url) {
          urlInput.value = data.url;
          previewImg.src = data.url;
          preview.style.display = 'block';
        } else {
          alert('Upload failed: ' + (data.error || 'Unknown error'));
        }
      })
      .catch(function(err) {
        alert('Upload error: ' + err.message);
      });
    }
  });
})();
