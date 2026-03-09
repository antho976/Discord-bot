import { EmbedBuilder, ChannelType } from 'discord.js';

export default function setup(app, deps, F) {
  const { addLog, client, requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.modMail) F.modMail = { enabled: false, categoryId: null, logChannelId: null, activeThreads: {} };

  async function handleModMailDM(message) {
    if (!F.modMail.enabled || !F.modMail.categoryId) return false;
    if (message.guild) return false;
    if (message.author.bot) return false;
    const userId = message.author.id;
    const guild = client.guilds.cache.first();
    if (!guild) return false;
    try {
      let thread = F.modMail.activeThreads[userId];
      let ch;
      if (thread) {
        ch = await client.channels.fetch(thread.channelId).catch(() => null);
        if (!ch) { delete F.modMail.activeThreads[userId]; thread = null; }
      }
      if (!thread) {
        ch = await guild.channels.create({
          name: `modmail-${message.author.username}`.slice(0, 100).replace(/[^a-z0-9-]/gi, '-'),
          type: ChannelType.GuildText, parent: F.modMail.categoryId,
          topic: `ModMail from ${message.author.tag} (${userId})`
        });
        F.modMail.activeThreads[userId] = { channelId: ch.id, createdAt: Date.now() };
        const openEmbed = new EmbedBuilder().setColor(0x3498DB).setTitle('📬 New ModMail')
          .setDescription(`From: <@${userId}> (${message.author.tag})`).setTimestamp();
        await ch.send({ embeds: [openEmbed] });
        await message.author.send('✅ Your message has been sent to the mod team. They will reply here.').catch(() => {});
        addLog('info', `ModMail opened by ${message.author.tag}`);
      }
      const fwdEmbed = new EmbedBuilder().setColor(0x2ECC71)
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .setDescription(message.content.slice(0, 4000) || '*[no text]*').setTimestamp();
      const opts = { embeds: [fwdEmbed] };
      if (message.attachments.size > 0) {
        opts.files = [...message.attachments.values()].slice(0, 5).map(a => a.url);
      }
      await ch.send(opts);
      saveState();
      return true;
    } catch (e) {
      addLog('error', `ModMail failed: ${e.message}`);
      return false;
    }
  }

  async function handleModMailReply(message) {
    if (!F.modMail.enabled) return false;
    if (!message.guild || message.author.bot) return false;
    const entry = Object.entries(F.modMail.activeThreads).find(([, t]) => t.channelId === message.channel.id);
    if (!entry) return false;
    const [userId] = entry;
    try {
      const user = await client.users.fetch(userId).catch(() => null);
      if (!user) return false;
      const replyEmbed = new EmbedBuilder().setColor(0x9B59B6)
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .setDescription(message.content.slice(0, 4000) || '*[no text]*')
        .setFooter({ text: 'Staff Reply' }).setTimestamp();
      await user.send({ embeds: [replyEmbed] });
      await message.react('✅').catch(() => {});
      return true;
    } catch (e) {
      addLog('error', `ModMail reply failed: ${e.message}`);
      return false;
    }
  }

  app.get('/api/features/modmail', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: { enabled: F.modMail.enabled, categoryId: F.modMail.categoryId, logChannelId: F.modMail.logChannelId, activeThreads: Object.keys(F.modMail.activeThreads).length } });
  });
  app.post('/api/features/modmail', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, categoryId, logChannelId } = req.body;
    if (typeof enabled === 'boolean') F.modMail.enabled = enabled;
    if (categoryId !== undefined) F.modMail.categoryId = categoryId || null;
    if (logChannelId !== undefined) F.modMail.logChannelId = logChannelId || null;
    saveState();
    dashAudit(req.userName, 'update-modmail', `ModMail: enabled=${F.modMail.enabled}`);
    res.json({ success: true });
  });
  app.post('/api/features/modmail/close', requireAuth, requireTier('moderator'), async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.json({ success: false, error: 'userId required' });
    const thread = F.modMail.activeThreads[userId];
    if (!thread) return res.json({ success: false, error: 'No active modmail thread' });
    try {
      const ch = await client.channels.fetch(thread.channelId).catch(() => null);
      if (ch) {
        await ch.send('📪 **This modmail thread has been closed by staff.**');
        setTimeout(() => ch.delete('ModMail closed').catch(() => {}), 5000);
      }
      const user = await client.users.fetch(userId).catch(() => null);
      if (user) await user.send('📪 Your modmail thread has been closed.').catch(() => {});
      delete F.modMail.activeThreads[userId];
      saveState();
      res.json({ success: true });
    } catch (e) {
      res.json({ success: false, error: 'Failed to close modmail thread' });
    }
  });

  return {
    hooks: { handleModMailDM, handleModMailReply },
    backgroundTasks: [],
    masterData: () => ({ modMail: { enabled: F.modMail.enabled, active: Object.keys(F.modMail.activeThreads).length } })
  };
}
