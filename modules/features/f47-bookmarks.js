import { EmbedBuilder } from 'discord.js';

export default function setup(app, deps, F) {
  const { requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.bookmarks) F.bookmarks = { enabled: false, emoji: '🔖' };

  async function handleBookmarkReaction(reaction, user) {
    if (!F.bookmarks.enabled) return;
    if (user.bot) return;
    if (reaction.emoji.name !== F.bookmarks.emoji) return;
    try {
      const msg = reaction.message;
      if (msg.partial) await msg.fetch();
      const embed = new EmbedBuilder()
        .setColor(0xF1C40F).setTitle('🔖 Bookmarked Message')
        .setDescription(msg.content?.slice(0, 4000) || '*[no text content]*')
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .addFields({ name: 'Source', value: `[Jump to message](${msg.url})` })
        .setTimestamp(msg.createdAt);
      if (msg.attachments.size > 0) {
        const first = msg.attachments.first();
        if (first.contentType?.startsWith('image/')) embed.setImage(first.url);
      }
      await user.send({ embeds: [embed] });
    } catch {}
  }

  app.get('/api/features/bookmarks', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: F.bookmarks });
  });
  app.post('/api/features/bookmarks', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, emoji } = req.body;
    if (typeof enabled === 'boolean') F.bookmarks.enabled = enabled;
    if (typeof emoji === 'string' && emoji.length > 0 && emoji.length <= 4) F.bookmarks.emoji = emoji;
    saveState();
    dashAudit(req.userName, 'update-bookmarks', `Bookmarks: enabled=${F.bookmarks.enabled}, emoji=${F.bookmarks.emoji}`);
    res.json({ success: true, config: F.bookmarks });
  });

  return {
    hooks: { handleBookmarkReaction },
    backgroundTasks: [],
    masterData: () => ({ bookmarks: { enabled: F.bookmarks.enabled } })
  };
}
