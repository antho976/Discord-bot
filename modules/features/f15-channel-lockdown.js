import { PermissionsBitField } from 'discord.js';

export default function setup(app, deps, F) {
  const { client, requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.lockedChannels) F.lockedChannels = {};

  async function lockChannel(channelId, userId) {
    try {
      const ch = client.channels.cache.get(channelId);
      if (!ch) return { success: false, error: 'Channel not found' };
      const guild = ch.guild;
      const everyoneRole = guild.roles.everyone;
      const currentPerms = ch.permissionOverwrites.cache.get(everyoneRole.id);
      F.lockedChannels[channelId] = {
        lockedBy: userId, lockedAt: Date.now(),
        previousSend: currentPerms?.deny?.has(PermissionsBitField.Flags.SendMessages) ? false : true
      };
      await ch.permissionOverwrites.edit(everyoneRole, { SendMessages: false }, { reason: 'Channel lockdown' });
      await ch.send('🔒 **This channel has been locked.**');
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Lockdown operation failed' };
    }
  }

  async function unlockChannel(channelId) {
    try {
      const ch = client.channels.cache.get(channelId);
      if (!ch) return { success: false, error: 'Channel not found' };
      const guild = ch.guild;
      const everyoneRole = guild.roles.everyone;
      const prev = F.lockedChannels[channelId];
      if (prev?.previousSend) {
        await ch.permissionOverwrites.edit(everyoneRole, { SendMessages: null }, { reason: 'Channel unlocked' });
      }
      delete F.lockedChannels[channelId];
      await ch.send('🔓 **This channel has been unlocked.**');
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Unlock operation failed' };
    }
  }

  app.get('/api/features/lockdown', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, locked: F.lockedChannels });
  });
  app.post('/api/features/lockdown', requireAuth, requireTier('admin'), async (req, res) => {
    const { channelId, action } = req.body;
    if (!channelId) return res.json({ success: false, error: 'channelId required' });
    let result;
    if (action === 'unlock') {
      result = await unlockChannel(channelId);
    } else {
      result = await lockChannel(channelId, req.userName);
    }
    if (result.success) {
      saveState();
      dashAudit(req.userName, 'channel-lockdown', `${action === 'unlock' ? 'Unlocked' : 'Locked'} channel ${channelId}`);
    }
    res.json(result);
  });

  return {
    hooks: {},
    backgroundTasks: [],
    masterData: () => ({ channelLockdown: { locked: Object.keys(F.lockedChannels).length } })
  };
}
