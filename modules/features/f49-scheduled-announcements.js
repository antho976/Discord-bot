import { EmbedBuilder } from 'discord.js';

export default function setup(app, deps, F) {
  const { addLog, client, requireAuth, requireTier, saveState, dashAudit } = deps;

  // F49: Scheduled Announcements — cron-like recurring announcements
  if (!F.scheduledAnnouncements) F.scheduledAnnouncements = { enabled: false, announcements: [] };
  // announcements: [{ id, channelId, message, embed, cronDay, cronHour, cronMinute, repeat, lastRun, label, template }]
  // cronDay: 0-6 (Sun-Sat) or '*' for daily, cronHour: 0-23, cronMinute: 0-59
  // template vars: {memberCount}, {date}, {time}, {serverName}

  function resolveTemplateVars(text) {
    const guild = client.guilds.cache.first();
    const now = new Date();
    return text
      .replace(/{memberCount}/g, guild?.memberCount || '?')
      .replace(/{date}/g, now.toISOString().slice(0, 10))
      .replace(/{time}/g, now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }))
      .replace(/{serverName}/g, guild?.name || 'Server')
      .replace(/{day}/g, ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()]);
  }

  async function checkScheduledAnnouncements() {
    if (!F.scheduledAnnouncements.enabled || !F.scheduledAnnouncements.announcements.length) return;
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    for (const ann of F.scheduledAnnouncements.announcements) {
      if (!ann.channelId) continue;

      // Check if cron matches
      const dayMatch = ann.cronDay === '*' || ann.cronDay === currentDay;
      const hourMatch = ann.cronHour === currentHour;
      const minuteMatch = ann.cronMinute === currentMinute;

      if (!dayMatch || !hourMatch || !minuteMatch) continue;

      // Prevent double-fire within the same minute
      const lastRun = ann.lastRun || 0;
      if (Date.now() - lastRun < 60000) continue;

      try {
        const ch = await client.channels.fetch(ann.channelId).catch(() => null);
        if (!ch) continue;

        if (ann.embed) {
          const embedData = { ...ann.embed };
          if (embedData.title) embedData.title = resolveTemplateVars(embedData.title);
          if (embedData.description) embedData.description = resolveTemplateVars(embedData.description);
          const embed = new EmbedBuilder(embedData).setTimestamp();
          await ch.send({ embeds: [embed] });
        } else {
          const content = resolveTemplateVars(ann.message || 'Scheduled announcement');
          await ch.send(content);
        }

        ann.lastRun = Date.now();
        addLog('info', `Scheduled announcement sent: ${ann.label || ann.id}`);
      } catch (e) {
        addLog('error', `Scheduled announcement failed (${ann.label || ann.id}): ${e.message}`);
      }
    }
  }

  // API routes
  app.get('/api/features/scheduled-announcements', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: { enabled: F.scheduledAnnouncements.enabled }, announcements: F.scheduledAnnouncements.announcements });
  });

  app.post('/api/features/scheduled-announcements', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled } = req.body;
    if (typeof enabled === 'boolean') F.scheduledAnnouncements.enabled = enabled;
    saveState();
    dashAudit(req.userName, 'update-scheduled-announcements', `Scheduled announcements: enabled=${F.scheduledAnnouncements.enabled}`);
    res.json({ success: true, config: { enabled: F.scheduledAnnouncements.enabled } });
  });

  app.post('/api/features/scheduled-announcements/add', requireAuth, requireTier('admin'), (req, res) => {
    const { channelId, message, embed, cronDay, cronHour, cronMinute, label } = req.body;
    if (!channelId) return res.json({ success: false, error: 'channelId required' });
    if (F.scheduledAnnouncements.announcements.length >= 50) {
      return res.json({ success: false, error: 'Maximum 50 announcements reached' });
    }
    const id = `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const ann = {
      id, channelId: String(channelId),
      message: message ? String(message).slice(0, 2000) : null,
      embed: embed && typeof embed === 'object' ? {
        title: String(embed.title || '').slice(0, 256),
        description: String(embed.description || '').slice(0, 4000),
        color: parseInt(embed.color) || 0x3498DB
      } : null,
      cronDay: cronDay === '*' ? '*' : Math.max(0, Math.min(6, parseInt(cronDay) || 0)),
      cronHour: Math.max(0, Math.min(23, parseInt(cronHour) || 0)),
      cronMinute: Math.max(0, Math.min(59, parseInt(cronMinute) || 0)),
      label: String(label || '').slice(0, 50),
      lastRun: 0
    };
    F.scheduledAnnouncements.announcements.push(ann);
    saveState();
    dashAudit(req.userName, 'add-scheduled-announcement', `Added: ${ann.label || ann.id}`);
    res.json({ success: true, announcement: ann });
  });

  app.post('/api/features/scheduled-announcements/remove', requireAuth, requireTier('admin'), (req, res) => {
    const { id } = req.body;
    if (!id) return res.json({ success: false, error: 'id required' });
    const idx = F.scheduledAnnouncements.announcements.findIndex(a => a.id === id);
    if (idx === -1) return res.json({ success: false, error: 'Announcement not found' });
    F.scheduledAnnouncements.announcements.splice(idx, 1);
    saveState();
    dashAudit(req.userName, 'remove-scheduled-announcement', `Removed: ${id}`);
    res.json({ success: true });
  });

  app.post('/api/features/scheduled-announcements/edit', requireAuth, requireTier('admin'), (req, res) => {
    const { id, channelId, message, embed, cronDay, cronHour, cronMinute, label } = req.body;
    if (!id) return res.json({ success: false, error: 'id required' });
    const ann = F.scheduledAnnouncements.announcements.find(a => a.id === id);
    if (!ann) return res.json({ success: false, error: 'Announcement not found' });
    if (channelId !== undefined) ann.channelId = String(channelId);
    if (message !== undefined) ann.message = message ? String(message).slice(0, 2000) : null;
    if (embed !== undefined) {
      ann.embed = embed && typeof embed === 'object' ? {
        title: String(embed.title || '').slice(0, 256),
        description: String(embed.description || '').slice(0, 4000),
        color: parseInt(embed.color) || 0x3498DB
      } : null;
    }
    if (cronDay !== undefined) ann.cronDay = cronDay === '*' ? '*' : Math.max(0, Math.min(6, parseInt(cronDay) || 0));
    if (cronHour !== undefined) ann.cronHour = Math.max(0, Math.min(23, parseInt(cronHour) || 0));
    if (cronMinute !== undefined) ann.cronMinute = Math.max(0, Math.min(59, parseInt(cronMinute) || 0));
    if (label !== undefined) ann.label = String(label).slice(0, 50);
    saveState();
    dashAudit(req.userName, 'edit-scheduled-announcement', `Edited: ${ann.label || ann.id}`);
    res.json({ success: true, announcement: ann });
  });

  return {
    hooks: {},
    backgroundTasks: [{ fn: checkScheduledAnnouncements, intervalMs: 60000 }],
    masterData: () => ({ scheduledAnnouncements: { enabled: F.scheduledAnnouncements.enabled, count: F.scheduledAnnouncements.announcements.length } })
  };
}
