import { PermissionsBitField } from 'discord.js';

export default function setup(app, deps, F) {
  const { requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.mediaOnly) F.mediaOnly = { enabled: false, channels: [], warningMessage: '⚠️ This channel only allows images, videos, and files.' };

  async function enforceMediaOnly(message) {
    if (!F.mediaOnly.enabled || !F.mediaOnly.channels.length) return false;
    if (!F.mediaOnly.channels.includes(message.channel.id)) return false;
    if (message.member?.permissions?.has(PermissionsBitField.Flags.ManageMessages)) return false;
    const hasMedia = message.attachments.size > 0 ||
      message.embeds.length > 0 ||
      /https?:\/\/\S+\.(png|jpg|jpeg|gif|webp|mp4|webm|mov)/i.test(message.content);
    if (!hasMedia) {
      try {
        await message.delete();
        const warn = await message.channel.send(`<@${message.author.id}> ${F.mediaOnly.warningMessage}`);
        setTimeout(() => warn.delete().catch(() => {}), 5000);
      } catch {}
      return true;
    }
    return false;
  }

  app.get('/api/features/media-only', requireAuth, requireTier('moderator'), (req, res) => {
    res.json({ success: true, config: F.mediaOnly });
  });
  app.post('/api/features/media-only', requireAuth, requireTier('moderator'), (req, res) => {
    const { enabled, channels, warningMessage } = req.body;
    if (typeof enabled === 'boolean') F.mediaOnly.enabled = enabled;
    if (Array.isArray(channels)) F.mediaOnly.channels = channels.filter(c => typeof c === 'string').slice(0, 20);
    if (typeof warningMessage === 'string') F.mediaOnly.warningMessage = warningMessage.slice(0, 500);
    saveState();
    dashAudit(req.userName, 'update-media-only', `Media-only: ${F.mediaOnly.channels.length} channels`);
    res.json({ success: true, config: F.mediaOnly });
  });

  return {
    hooks: { enforceMediaOnly },
    backgroundTasks: [],
    masterData: () => ({ mediaOnly: { enabled: F.mediaOnly.enabled, channels: F.mediaOnly.channels.length } })
  };
}
