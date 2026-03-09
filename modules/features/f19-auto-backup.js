import fs from 'fs';
import { AttachmentBuilder } from 'discord.js';

export default function setup(app, deps, F) {
  const { addLog, client, requireAuth, requireTier, saveState, dashAudit, DATA_DIR } = deps;

  if (!F.autoBackupDiscord) F.autoBackupDiscord = { enabled: false, channelId: null, intervalHours: 24, lastBackup: 0 };

  async function autoBackupToDiscord() {
    if (!F.autoBackupDiscord.enabled || !F.autoBackupDiscord.channelId) return;
    const now = Date.now();
    const interval = (F.autoBackupDiscord.intervalHours || 24) * 3600000;
    if (now - F.autoBackupDiscord.lastBackup < interval) return;
    try {
      const ch = await client.channels.fetch(F.autoBackupDiscord.channelId);
      if (!ch) return;
      const backupData = {};
      const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f !== 'backups');
      for (const f of files) {
        try { backupData[f] = JSON.parse(fs.readFileSync(`${DATA_DIR}/${f}`, 'utf8')); } catch {}
      }
      const buffer = Buffer.from(JSON.stringify(backupData, null, 2));
      const attachment = new AttachmentBuilder(buffer, { name: `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json` });
      await ch.send({ content: '📦 **Automatic Backup**', files: [attachment] });
      F.autoBackupDiscord.lastBackup = now;
      addLog('info', 'Auto-backup sent to Discord channel');
    } catch (e) {
      addLog('error', `Auto-backup to Discord failed: ${e.message}`);
    }
  }

  app.get('/api/features/auto-backup-discord', requireAuth, requireTier('owner'), (req, res) => {
    res.json({ success: true, config: F.autoBackupDiscord });
  });
  app.post('/api/features/auto-backup-discord', requireAuth, requireTier('owner'), (req, res) => {
    const { enabled, channelId, intervalHours } = req.body;
    if (typeof enabled === 'boolean') F.autoBackupDiscord.enabled = enabled;
    if (channelId !== undefined) F.autoBackupDiscord.channelId = channelId || null;
    if (intervalHours != null) F.autoBackupDiscord.intervalHours = Math.max(1, Math.min(168, parseInt(intervalHours) || 24));
    saveState();
    dashAudit(req.userName, 'update-auto-backup-discord', `Auto-backup: enabled=${F.autoBackupDiscord.enabled}`);
    res.json({ success: true, config: F.autoBackupDiscord });
  });

  return {
    hooks: {},
    backgroundTasks: [{ fn: autoBackupToDiscord, intervalMs: 3600000 }],
    masterData: () => ({ autoBackupDiscord: { enabled: F.autoBackupDiscord.enabled } })
  };
}
