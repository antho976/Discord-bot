import { EmbedBuilder } from 'discord.js';

export default function setup(app, deps, F) {
  const { addLog, client, requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.memberMilestones) F.memberMilestones = { enabled: false, channelId: null, anniversaries: true, countMilestones: [100, 500, 1000, 5000] };

  async function checkMemberMilestone(guild) {
    if (!F.memberMilestones.enabled || !F.memberMilestones.channelId) return;
    const count = guild.memberCount;
    if (F.memberMilestones.countMilestones.includes(count)) {
      try {
        const ch = await client.channels.fetch(F.memberMilestones.channelId);
        if (!ch) return;
        const embed = new EmbedBuilder()
          .setColor(0xFFD700).setTitle('🎉 Member Milestone!')
          .setDescription(`We just reached **${count}** members!`).setTimestamp();
        await ch.send({ embeds: [embed] });
        addLog('info', `Member milestone: ${count} members`);
      } catch {}
    }
  }

  async function checkMemberAnniversary(member) {
    if (!F.memberMilestones.enabled || !F.memberMilestones.anniversaries || !F.memberMilestones.channelId) return;
    const joinedAt = member.joinedAt;
    if (!joinedAt) return;
    const now = new Date();
    const years = now.getFullYear() - joinedAt.getFullYear();
    if (years < 1) return;
    if (now.getMonth() === joinedAt.getMonth() && now.getDate() === joinedAt.getDate()) {
      try {
        const ch = await client.channels.fetch(F.memberMilestones.channelId);
        if (!ch) return;
        const embed = new EmbedBuilder()
          .setColor(0x9146FF).setTitle('🎂 Member Anniversary!')
          .setDescription(`<@${member.id}> has been a member for **${years} year${years > 1 ? 's' : ''}**!`).setTimestamp();
        await ch.send({ embeds: [embed] });
      } catch {}
    }
  }

  app.get('/api/features/member-milestones', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: F.memberMilestones });
  });
  app.post('/api/features/member-milestones', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, channelId, anniversaries, countMilestones } = req.body;
    if (typeof enabled === 'boolean') F.memberMilestones.enabled = enabled;
    if (channelId !== undefined) F.memberMilestones.channelId = channelId || null;
    if (typeof anniversaries === 'boolean') F.memberMilestones.anniversaries = anniversaries;
    if (Array.isArray(countMilestones)) {
      F.memberMilestones.countMilestones = countMilestones.map(n => parseInt(n)).filter(n => n > 0).slice(0, 20);
    }
    saveState();
    dashAudit(req.userName, 'update-milestones', `Milestones: enabled=${F.memberMilestones.enabled}`);
    res.json({ success: true, config: F.memberMilestones });
  });

  return {
    hooks: { checkMemberMilestone },
    backgroundTasks: [{
      fn: async () => {
        if (!F.memberMilestones.enabled) return;
        const guild = client.guilds.cache.first();
        if (!guild) return;
        const members = await guild.members.fetch().catch(() => null);
        if (!members) return;
        for (const [, member] of members) { await checkMemberAnniversary(member); }
      },
      intervalMs: 86400000
    }],
    masterData: () => ({ memberMilestones: { enabled: F.memberMilestones.enabled } })
  };
}
