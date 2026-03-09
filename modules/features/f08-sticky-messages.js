import { EmbedBuilder } from 'discord.js';

export default function setup(app, deps, F) {
  const { addLog, client, requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.stickyMessages) F.stickyMessages = {};

  async function handleStickyMessage(channelId) {
    const sticky = F.stickyMessages[channelId];
    if (!sticky) return;
    try {
      const ch = client.channels.cache.get(channelId);
      if (!ch) return;
      if (sticky.messageId) {
        try { const old = await ch.messages.fetch(sticky.messageId); await old.delete(); } catch {}
      }
      const opts = {};
      if (sticky.embed) {
        opts.embeds = [new EmbedBuilder(sticky.embed)];
      } else {
        opts.content = sticky.content || '📌 Pinned message';
      }
      const msg = await ch.send(opts);
      sticky.messageId = msg.id;
    } catch (e) {
      addLog('error', `Sticky message failed in ${channelId}: ${e.message}`);
    }
  }

  app.get('/api/features/sticky-messages', requireAuth, requireTier('moderator'), (req, res) => {
    res.json({ success: true, stickies: F.stickyMessages });
  });
  app.post('/api/features/sticky-messages', requireAuth, requireTier('moderator'), (req, res) => {
    const { channelId, content, embed, remove } = req.body;
    if (!channelId) return res.json({ success: false, error: 'channelId required' });
    if (remove) {
      delete F.stickyMessages[channelId];
    } else {
      F.stickyMessages[channelId] = { content: String(content || '').slice(0, 2000), messageId: null, embed: embed || null };
      handleStickyMessage(channelId);
    }
    saveState();
    dashAudit(req.userName, 'sticky-message', remove ? `Removed sticky from ${channelId}` : `Set sticky in ${channelId}`);
    res.json({ success: true });
  });

  return {
    hooks: { handleStickyMessage },
    backgroundTasks: [],
    masterData: () => ({ stickyMessages: { count: Object.keys(F.stickyMessages).length } })
  };
}
