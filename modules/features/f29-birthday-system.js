import { EmbedBuilder } from 'discord.js';

export default function setup(app, deps, F) {
  const { addLog, client, requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.birthdays) F.birthdays = { enabled: false, channelId: null, roleId: null, entries: {} };

  async function checkBirthdays() {
    if (!F.birthdays.enabled || !F.birthdays.channelId) return;
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const guild = client.guilds.cache.first();
    if (!guild) return;
    for (const [userId, bd] of Object.entries(F.birthdays.entries)) {
      if (bd.month === month && bd.day === day && !bd.announced) {
        try {
          const ch = await client.channels.fetch(F.birthdays.channelId);
          if (!ch) continue;
          const embed = new EmbedBuilder()
            .setColor(0xFF69B4).setTitle('🎂 Happy Birthday!')
            .setDescription(`Happy Birthday <@${userId}>! 🎉🎈`).setTimestamp();
          await ch.send({ embeds: [embed] });
          bd.announced = true;
          if (F.birthdays.roleId) {
            const member = await guild.members.fetch(userId).catch(() => null);
            if (member) {
              await member.roles.add(F.birthdays.roleId, 'Birthday!').catch(() => {});
              setTimeout(async () => {
                await member.roles.remove(F.birthdays.roleId, 'Birthday over').catch(() => {});
              }, 86400000);
            }
          }
        } catch {}
      }
      if ((bd.month !== month || bd.day !== day) && bd.announced) bd.announced = false;
    }
  }

  app.get('/api/features/birthdays', requireAuth, (req, res) => {
    res.json({ success: true, config: { enabled: F.birthdays.enabled, channelId: F.birthdays.channelId, roleId: F.birthdays.roleId }, entries: F.birthdays.entries });
  });
  app.post('/api/features/birthdays', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, channelId, roleId } = req.body;
    if (typeof enabled === 'boolean') F.birthdays.enabled = enabled;
    if (channelId !== undefined) F.birthdays.channelId = channelId || null;
    if (roleId !== undefined) F.birthdays.roleId = roleId || null;
    saveState();
    dashAudit(req.userName, 'update-birthdays', `Birthdays: enabled=${F.birthdays.enabled}`);
    res.json({ success: true });
  });
  app.post('/api/features/birthdays/set', requireAuth, (req, res) => {
    const { userId, month, day } = req.body;
    if (!userId || !month || !day) return res.json({ success: false, error: 'userId, month, day required' });
    const m = parseInt(month), d = parseInt(day);
    if (m < 1 || m > 12 || d < 1 || d > 31) return res.json({ success: false, error: 'Invalid date' });
    F.birthdays.entries[userId] = { month: m, day: d };
    saveState();
    res.json({ success: true });
  });

  return {
    hooks: {},
    backgroundTasks: [{ fn: checkBirthdays, intervalMs: 86400000, runOnStart: true }],
    masterData: () => ({ birthdays: { enabled: F.birthdays.enabled, count: Object.keys(F.birthdays.entries).length } })
  };
}
