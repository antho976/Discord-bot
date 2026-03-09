export default function setup(app, deps, F) {
  const { addLog, client, requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.smartSlowmode) F.smartSlowmode = { enabled: false, channels: [], threshold: 10, windowSec: 10, slowmodeSec: 5, cooldownSec: 60 };
  const messageRates = {};

  function trackMessageRate(channelId) {
    if (!F.smartSlowmode.enabled) return;
    if (!F.smartSlowmode.channels.includes(channelId)) return;
    const now = Date.now();
    const window = (F.smartSlowmode.windowSec || 10) * 1000;
    if (!messageRates[channelId] || now - messageRates[channelId].windowStart > window) {
      messageRates[channelId] = { count: 1, windowStart: now };
    } else {
      messageRates[channelId].count++;
    }
    if (messageRates[channelId].count >= (F.smartSlowmode.threshold || 10)) {
      applySmartSlowmode(channelId).catch(() => {});
    }
  }

  async function applySmartSlowmode(channelId) {
    try {
      const ch = client.channels.cache.get(channelId);
      if (!ch || ch.rateLimitPerUser > 0) return;
      const slowSec = F.smartSlowmode.slowmodeSec || 5;
      await ch.setRateLimitPerUser(slowSec, 'Smart slowmode activated');
      addLog('info', `Smart slowmode: ${slowSec}s applied to ${channelId}`);
      setTimeout(async () => {
        try {
          await ch.setRateLimitPerUser(0, 'Smart slowmode expired');
          addLog('info', `Smart slowmode: removed from ${channelId}`);
        } catch {}
      }, (F.smartSlowmode.cooldownSec || 60) * 1000);
    } catch (e) {
      addLog('error', `Smart slowmode failed: ${e.message}`);
    }
  }

  app.get('/api/features/smart-slowmode', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: F.smartSlowmode });
  });
  app.post('/api/features/smart-slowmode', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, channels, threshold, windowSec, slowmodeSec, cooldownSec } = req.body;
    if (typeof enabled === 'boolean') F.smartSlowmode.enabled = enabled;
    if (Array.isArray(channels)) F.smartSlowmode.channels = channels.filter(c => typeof c === 'string');
    if (threshold != null) F.smartSlowmode.threshold = Math.max(3, Math.min(100, parseInt(threshold) || 10));
    if (windowSec != null) F.smartSlowmode.windowSec = Math.max(5, Math.min(60, parseInt(windowSec) || 10));
    if (slowmodeSec != null) F.smartSlowmode.slowmodeSec = Math.max(1, Math.min(120, parseInt(slowmodeSec) || 5));
    if (cooldownSec != null) F.smartSlowmode.cooldownSec = Math.max(10, Math.min(600, parseInt(cooldownSec) || 60));
    saveState();
    dashAudit(req.userName, 'update-smart-slowmode', `Smart slowmode: enabled=${F.smartSlowmode.enabled}`);
    res.json({ success: true, config: F.smartSlowmode });
  });

  return {
    hooks: { trackMessageRate },
    backgroundTasks: [],
    masterData: () => ({ smartSlowmode: { enabled: F.smartSlowmode.enabled } })
  };
}
