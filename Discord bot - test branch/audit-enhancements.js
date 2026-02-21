// Audit Log Enhancement Functions

// Stats tracking
let auditStats = {
  totalEvents: 0,
  bans: 0,
  newAccounts: 0,
  joins: 0,
  leaves: 0,
  lastUpdated: Date.now()
};

// Message/role batching buffers
const messageBatchBuffer = new Map(); // key: userId, value: { count, lastTimestamp }
const roleBatchBuffer = new Map(); // key: userId, value: { added: [], removed: [], lastTimestamp }

const BATCH_TIMEOUT = 5000; // 5 seconds

function refreshAuditStats() {
  fetch('/api/audit/stats')
    .then(r => r.json())
    .then(data => {
      document.getElementById('statTotalEvents').textContent = data.totalEvents || 0;
      document.getElementById('statBans').textContent = data.bans || 0;
      document.getElementById('statNewAccounts').textContent = data.newAccounts || 0;
      document.getElementById('statJoins').textContent = data.joins || 0;
      document.getElementById('statLeaves').textContent = data.leaves || 0;
    })
    .catch(() => {
      console.error('Failed to load audit stats');
    });
}

function cleanupOldLogs() {
  if (!confirm('This will delete logs older than the retention period. Continue?')) return;
  
  fetch('/api/audit/cleanup', { method: 'POST' })
    .then(r => r.json())
    .then(data => {
      alert(`✅ Cleanup complete! Deleted ${data.deleted || 0} old log messages.`);
    })
    .catch(() => alert('❌ Cleanup failed'));
}

function exportAuditLogs() {
  const days = prompt('Export logs from the last X days:', '30');
  if (!days) return;
  
  fetch(`/api/audit/export?days=${days}`)
    .then(r => r.json())
    .then(data => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      alert(`✅ Exported ${data.logs?.length || 0} log entries`);
    })
    .catch(() => alert('❌ Export failed'));
}

function searchAuditLogs() {
  const userId = document.getElementById('logSearchUserId').value.trim();
  const eventType = document.getElementById('logSearchEventType').value;
  const keyword = document.getElementById('logSearchKeyword').value.trim();
  
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  if (eventType) params.append('eventType', eventType);
  if (keyword) params.append('keyword', keyword);
  
  fetch(`/api/audit/search?${params}`)
    .then(r => r.json())
    .then(data => {
      const results = document.getElementById('logSearchResults');
      if (!data.logs || data.logs.length === 0) {
        results.innerHTML = '<div style="text-align:center;padding:20px;color:#999">No results found</div>';
        results.style.display = 'block';
        return;
      }
      
      results.innerHTML = data.logs.map(log => {
        const date = new Date(log.timestamp).toLocaleString();
        return `<div style="padding:8px;border-bottom:1px solid #3a3a42;font-size:12px">
          <div style="color:#9146ff;font-weight:bold">${log.eventType || 'Unknown Event'}</div>
          <div style="color:#b0b0b0">${log.description || ''}</div>
          <div style="color:#666;font-size:11px">${date} | User: ${log.userId || 'N/A'}</div>
        </div>`;
      }).join('');
      results.style.display = 'block';
    })
    .catch(() => {
      alert('❌ Search failed');
    });
}

function toggleMuteRoleAutoDetect() {
  const checkbox = document.getElementById('autoDetectMuteRole');
  const textarea = document.getElementById('muteRoleIdsInput');
  
  if (checkbox.checked) {
    textarea.disabled = true;
    textarea.placeholder = 'Auto-detecting mute role...';
    
    // Fetch auto-detected mute role
    fetch('/api/audit/detect-mute-role')
      .then(r => r.json())
      .then(data => {
        if (data.roleId) {
          textarea.value = data.roleId;
          textarea.placeholder = `Auto-detected: ${data.roleName || data.roleId}`;
        } else {
          textarea.placeholder = 'No mute role found';
        }
      });
  } else {
    textarea.disabled = false;
    textarea.placeholder = 'Mute role IDs';
  }
}

// Initialize on page load
if (typeof refreshAuditStats === 'function') {
  refreshAuditStats();
}

// Batching functions for role updates
function batchRoleUpdate(userId, addedRoles, removedRoles) {
  const key = userId;
  const existing = roleBatchBuffer.get(key);
  
  if (existing) {
    clearTimeout(existing.timeout);
    existing.added.push(...addedRoles);
    existing.removed.push(...removedRoles);
  } else {
    roleBatchBuffer.set(key, {
      added: [...addedRoles],
      removed: [...removedRoles],
      timestamp: Date.now()
    });
  }
  
  const entry = roleBatchBuffer.get(key);
  entry.timeout = setTimeout(() => {
    flushRoleBatch(userId);
  }, BATCH_TIMEOUT);
}

function flushRoleBatch(userId) {
  const entry = roleBatchBuffer.get(userId);
  if (!entry) return;
  
  // Send batched role update to audit log
  const addedCount = entry.added.length;
  const removedCount = entry.removed.length;
  
  if (addedCount > 0 || removedCount > 0) {
    const message = `Role changes for <@${userId}>: +${addedCount} roles, -${removedCount} roles`;
    // This would be logged via the backend
  }
  
  roleBatchBuffer.delete(userId);
}

// Batching functions for message deletes
function batchMessageDelete(channelId, userId) {
  const key = `${channelId}-${userId}`;
  const existing = messageBatchBuffer.get(key);
  
  if (existing) {
    clearTimeout(existing.timeout);
    existing.count++;
  } else {
    messageBatchBuffer.set(key, {
      count: 1,
      timestamp: Date.now()
    });
  }
  
  const entry = messageBatchBuffer.get(key);
  entry.timeout = setTimeout(() => {
    flushMessageBatch(channelId, userId);
  }, BATCH_TIMEOUT);
}

function flushMessageBatch(channelId, userId) {
  const key = `${channelId}-${userId}`;
  const entry = messageBatchBuffer.get(key);
  if (!entry) return;
  
  // Send batched message delete to audit log
  if (entry.count > 1) {
    const message = `${entry.count} messages deleted by <@${userId}> in <#${channelId}>`;
    // This would be logged via the backend
  }
  
  messageBatchBuffer.delete(key);
}

module.exports = {
  batchRoleUpdate,
  batchMessageDelete,
  flushRoleBatch,
  flushMessageBatch,
  auditStats
};
