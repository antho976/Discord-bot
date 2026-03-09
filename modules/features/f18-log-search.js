import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');

export default function setup(app, deps, F) {
  const { requireAuth, requireTier } = deps;

  if (!F.logSearch) F.logSearch = { enabled: true, maxResults: 200 };

  app.get('/api/features/log-search', requireAuth, requireTier('moderator'), (req, res) => {
    const { user, type, from, to, q, limit } = req.query;
    const LOG_FILE = path.join(ROOT_DIR, 'logs.json');
    let logs = [];
    try { logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch {}
    let filtered = logs;
    if (user) filtered = filtered.filter(l => (l.message || '').toLowerCase().includes(user.toLowerCase()));
    if (type) filtered = filtered.filter(l => l.type === type);
    if (from) filtered = filtered.filter(l => new Date(l.timestamp) >= new Date(from));
    if (to) filtered = filtered.filter(l => new Date(l.timestamp) <= new Date(to));
    if (q) filtered = filtered.filter(l => (l.message || '').toLowerCase().includes(q.toLowerCase()));
    const maxResults = Math.min(parseInt(limit) || 200, 500);
    res.json({ success: true, logs: filtered.slice(-maxResults), total: filtered.length });
  });

  return {
    hooks: {},
    backgroundTasks: [],
    masterData: () => ({ logSearch: { enabled: F.logSearch.enabled } })
  };
}
