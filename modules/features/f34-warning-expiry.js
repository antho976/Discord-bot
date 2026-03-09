export default function setup(app, deps, F) {
  const { addLog, warnings, requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.warningExpiry) F.warningExpiry = { enabled: false, expiryDays: 30 };

  function processWarningExpiry() {
    if (!F.warningExpiry.enabled || !warnings) return;
    const now = Date.now();
    const expiryMs = (F.warningExpiry.expiryDays || 30) * 86400000;
    let expiredCount = 0;
    for (const [userId, userWarnings] of Object.entries(warnings)) {
      if (!Array.isArray(userWarnings)) continue;
      const before = userWarnings.length;
      warnings[userId] = userWarnings.filter(w => {
        const warnTime = w.timestamp || w.date || 0;
        return (now - warnTime) < expiryMs;
      });
      expiredCount += before - warnings[userId].length;
      if (warnings[userId].length === 0) delete warnings[userId];
    }
    if (expiredCount > 0) addLog('info', `Warning expiry: removed ${expiredCount} expired warnings`);
  }

  app.get('/api/features/warning-expiry', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: F.warningExpiry });
  });
  app.post('/api/features/warning-expiry', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, expiryDays } = req.body;
    if (typeof enabled === 'boolean') F.warningExpiry.enabled = enabled;
    if (expiryDays != null) F.warningExpiry.expiryDays = Math.max(1, Math.min(365, parseInt(expiryDays) || 30));
    saveState();
    dashAudit(req.userName, 'update-warning-expiry', `Warning expiry: ${F.warningExpiry.expiryDays} days, enabled=${F.warningExpiry.enabled}`);
    res.json({ success: true, config: F.warningExpiry });
  });

  return {
    hooks: {},
    backgroundTasks: [{ fn: processWarningExpiry, intervalMs: 21600000 }],
    masterData: () => ({ warningExpiry: { enabled: F.warningExpiry.enabled, days: F.warningExpiry.expiryDays } })
  };
}
