export default function setup(app, deps, F) {
  const { client, requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.statusRotation) F.statusRotation = { enabled: false, statuses: [], intervalMinutes: 5 };
  let statusRotationTimer = null;

  function startStatusRotation() {
    if (statusRotationTimer) clearInterval(statusRotationTimer);
    if (!F.statusRotation.enabled || !F.statusRotation.statuses.length) return;
    let idx = 0;
    const rotate = () => {
      if (!F.statusRotation.statuses.length) return;
      const s = F.statusRotation.statuses[idx % F.statusRotation.statuses.length];
      const typeMap = { Playing: 0, Streaming: 1, Listening: 2, Watching: 3, Competing: 5 };
      client.user?.setActivity(s.text, { type: typeMap[s.type] || 0 });
      idx++;
    };
    rotate();
    statusRotationTimer = setInterval(rotate, (F.statusRotation.intervalMinutes || 5) * 60000);
  }

  app.get('/api/features/status-rotation', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: F.statusRotation });
  });
  app.post('/api/features/status-rotation', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, statuses, intervalMinutes } = req.body;
    if (typeof enabled === 'boolean') F.statusRotation.enabled = enabled;
    if (Array.isArray(statuses)) {
      F.statusRotation.statuses = statuses.slice(0, 20).map(s => ({
        text: String(s.text || '').slice(0, 128),
        type: ['Playing', 'Watching', 'Listening', 'Competing'].includes(s.type) ? s.type : 'Playing'
      }));
    }
    if (intervalMinutes != null) F.statusRotation.intervalMinutes = Math.max(1, Math.min(1440, parseInt(intervalMinutes) || 5));
    startStatusRotation();
    saveState();
    dashAudit(req.userName, 'update-status-rotation', `Status rotation: enabled=${F.statusRotation.enabled}, ${F.statusRotation.statuses.length} statuses`);
    res.json({ success: true, config: F.statusRotation });
  });

  return {
    hooks: {},
    backgroundTasks: [{ fn: startStatusRotation, runOnStart: true }],
    masterData: () => ({ statusRotation: { enabled: F.statusRotation.enabled, statuses: F.statusRotation.statuses.length } })
  };
}
