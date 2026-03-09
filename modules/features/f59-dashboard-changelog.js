import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');

export default function setup(app, deps, F) {
  const { requireAuth, requireTier, saveState, DATA_DIR } = deps;

  // F59: Dashboard Changelog — auto-generated changelog from audit log entries
  if (!F.dashboardChangelog) F.dashboardChangelog = { enabled: true, entries: [], maxEntries: 500 };
  // entries: [{ ts, user, action, detail }]

  function addChangelogEntry(user, action, detail) {
    if (!F.dashboardChangelog.enabled) return;
    F.dashboardChangelog.entries.push({
      ts: Date.now(),
      user: String(user || 'System').slice(0, 50),
      action: String(action || '').slice(0, 100),
      detail: String(detail || '').slice(0, 500)
    });
    const max = F.dashboardChangelog.maxEntries || 500;
    if (F.dashboardChangelog.entries.length > max) {
      F.dashboardChangelog.entries = F.dashboardChangelog.entries.slice(-Math.floor(max / 2));
    }
  }

  // Periodically sync from audit history file
  function syncFromAuditHistory() {
    try {
      const auditPath = path.join(DATA_DIR, 'dashboard-audit.json');
      if (!fs.existsSync(auditPath)) return;
      const auditData = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
      const entries = Array.isArray(auditData) ? auditData : auditData.entries || [];
      if (!entries.length) return;

      // Get last synced timestamp
      const lastTs = F.dashboardChangelog.entries.length > 0
        ? F.dashboardChangelog.entries[F.dashboardChangelog.entries.length - 1].ts
        : 0;

      let newCount = 0;
      for (const entry of entries) {
        const entryTs = entry.timestamp || entry.ts || 0;
        if (entryTs > lastTs) {
          F.dashboardChangelog.entries.push({
            ts: entryTs,
            user: entry.user || entry.userName || 'Unknown',
            action: entry.action || entry.type || 'unknown',
            detail: entry.detail || entry.message || ''
          });
          newCount++;
        }
      }

      if (newCount > 0) {
        const max = F.dashboardChangelog.maxEntries || 500;
        if (F.dashboardChangelog.entries.length > max) {
          F.dashboardChangelog.entries = F.dashboardChangelog.entries.slice(-Math.floor(max / 2));
        }
      }
    } catch {}
  }

  // API routes
  app.get('/api/features/changelog', requireAuth, (req, res) => {
    const { limit, from, to, user, action } = req.query;
    let entries = [...F.dashboardChangelog.entries];

    if (user) entries = entries.filter(e => e.user.toLowerCase().includes(user.toLowerCase()));
    if (action) entries = entries.filter(e => e.action.toLowerCase().includes(action.toLowerCase()));
    if (from) entries = entries.filter(e => e.ts >= parseInt(from));
    if (to) entries = entries.filter(e => e.ts <= parseInt(to));

    const maxLimit = Math.min(parseInt(limit) || 100, 500);
    entries = entries.slice(-maxLimit).reverse(); // Most recent first

    res.json({ success: true, entries, total: F.dashboardChangelog.entries.length });
  });

  app.post('/api/features/changelog', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, maxEntries } = req.body;
    if (typeof enabled === 'boolean') F.dashboardChangelog.enabled = enabled;
    if (maxEntries != null) F.dashboardChangelog.maxEntries = Math.max(50, Math.min(5000, parseInt(maxEntries) || 500));
    saveState();
    res.json({ success: true, config: { enabled: F.dashboardChangelog.enabled, maxEntries: F.dashboardChangelog.maxEntries } });
  });

  app.post('/api/features/changelog/clear', requireAuth, requireTier('owner'), (req, res) => {
    F.dashboardChangelog.entries = [];
    saveState();
    res.json({ success: true });
  });

  return {
    hooks: { addChangelogEntry },
    backgroundTasks: [{ fn: syncFromAuditHistory, intervalMs: 300000 }],
    masterData: () => ({ dashboardChangelog: { enabled: F.dashboardChangelog.enabled, entries: F.dashboardChangelog.entries.length } })
  };
}
