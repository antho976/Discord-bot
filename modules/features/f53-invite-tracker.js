import { EmbedBuilder } from 'discord.js';

export default function setup(app, deps, F) {
  const { addLog, client, requireAuth, requireTier, saveState, dashAudit } = deps;

  // F53: Invite Tracker — track which invite link brought each member
  if (!F.inviteTracker) F.inviteTracker = { enabled: false, channelId: null, inviteCache: {}, memberInvites: {} };
  // inviteCache: { code: { uses, inviterId } }
  // memberInvites: { odId: { code, inviterId, joinedAt } }

  async function cacheInvites() {
    if (!F.inviteTracker.enabled) return;
    try {
      const guild = client.guilds.cache.first();
      if (!guild) return;
      const invites = await guild.invites.fetch();
      F.inviteTracker.inviteCache = {};
      for (const [code, invite] of invites) {
        F.inviteTracker.inviteCache[code] = {
          uses: invite.uses || 0,
          inviterId: invite.inviter?.id || null,
          channel: invite.channel?.name || null
        };
      }
    } catch (e) {
      addLog('error', `Invite cache refresh failed: ${e.message}`);
    }
  }

  async function trackMemberInvite(member) {
    if (!F.inviteTracker.enabled) return;
    try {
      const guild = member.guild;
      const newInvites = await guild.invites.fetch();
      const oldCache = F.inviteTracker.inviteCache || {};

      let usedInvite = null;
      for (const [code, invite] of newInvites) {
        const oldUses = oldCache[code]?.uses || 0;
        if ((invite.uses || 0) > oldUses) {
          usedInvite = { code, inviterId: invite.inviter?.id || null };
          break;
        }
      }

      // Update cache
      F.inviteTracker.inviteCache = {};
      for (const [code, invite] of newInvites) {
        F.inviteTracker.inviteCache[code] = {
          uses: invite.uses || 0,
          inviterId: invite.inviter?.id || null,
          channel: invite.channel?.name || null
        };
      }

      if (usedInvite) {
        F.inviteTracker.memberInvites[member.id] = {
          code: usedInvite.code,
          inviterId: usedInvite.inviterId,
          joinedAt: Date.now()
        };

        // Post to log channel
        if (F.inviteTracker.channelId) {
          const ch = await client.channels.fetch(F.inviteTracker.channelId).catch(() => null);
          if (ch) {
            const embed = new EmbedBuilder()
              .setColor(0x2ECC71)
              .setTitle('📨 Member Joined via Invite')
              .setDescription(`<@${member.id}> joined using invite \`${usedInvite.code}\``)
              .addFields(
                { name: 'Invited by', value: usedInvite.inviterId ? `<@${usedInvite.inviterId}>` : 'Unknown', inline: true },
                { name: 'Invite Code', value: usedInvite.code, inline: true }
              )
              .setThumbnail(member.user.displayAvatarURL())
              .setTimestamp();
            await ch.send({ embeds: [embed] });
          }
        }

        addLog('info', `Invite tracked: ${member.user.tag} via ${usedInvite.code} (by ${usedInvite.inviterId || 'unknown'})`);
      }

      saveState();
    } catch (e) {
      addLog('error', `Invite tracking failed: ${e.message}`);
    }
  }

  function getInviteLeaderboard() {
    const counts = {};
    for (const [, info] of Object.entries(F.inviteTracker.memberInvites || {})) {
      if (info.inviterId) {
        counts[info.inviterId] = (counts[info.inviterId] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
  }

  // API routes
  app.get('/api/features/invite-tracker', requireAuth, requireTier('admin'), (req, res) => {
    res.json({
      success: true,
      config: { enabled: F.inviteTracker.enabled, channelId: F.inviteTracker.channelId },
      stats: {
        trackedMembers: Object.keys(F.inviteTracker.memberInvites || {}).length,
        cachedInvites: Object.keys(F.inviteTracker.inviteCache || {}).length
      },
      leaderboard: getInviteLeaderboard()
    });
  });

  app.post('/api/features/invite-tracker', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, channelId } = req.body;
    if (typeof enabled === 'boolean') {
      F.inviteTracker.enabled = enabled;
      if (enabled) cacheInvites();
    }
    if (channelId !== undefined) F.inviteTracker.channelId = channelId || null;
    saveState();
    dashAudit(req.userName, 'update-invite-tracker', `Invite tracker: enabled=${F.inviteTracker.enabled}`);
    res.json({ success: true, config: { enabled: F.inviteTracker.enabled, channelId: F.inviteTracker.channelId } });
  });

  app.get('/api/features/invite-tracker/leaderboard', requireAuth, requireTier('moderator'), (req, res) => {
    res.json({ success: true, leaderboard: getInviteLeaderboard() });
  });

  app.get('/api/features/invite-tracker/member/:userId', requireAuth, requireTier('moderator'), (req, res) => {
    const info = F.inviteTracker.memberInvites[req.params.userId];
    res.json({ success: true, invite: info || null });
  });

  return {
    hooks: { trackMemberInvite, cacheInvites },
    backgroundTasks: [{ fn: cacheInvites, runOnStart: true }],
    masterData: () => ({ inviteTracker: { enabled: F.inviteTracker.enabled, trackedMembers: Object.keys(F.inviteTracker.memberInvites || {}).length } })
  };
}
