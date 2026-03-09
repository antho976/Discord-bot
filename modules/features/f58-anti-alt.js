import { EmbedBuilder } from 'discord.js';

export default function setup(app, deps, F) {
  const { addLog, client, requireAuth, requireTier, saveState, dashAudit } = deps;

  // F58: Anti-Alt Detector — flag new accounts that join shortly after a ban
  if (!F.antiAlt) F.antiAlt = {
    enabled: false,
    minAccountAgeDays: 7,
    logChannelId: null,
    action: 'log',  // 'log' | 'kick' | 'quarantine'
    quarantineRoleId: null,
    recentBans: [],  // [{ userId, username, bannedAt }]
    banWindowMinutes: 30,
    flagged: []      // [{ userId, username, reason, joinedAt, accountCreated, action }]
  };

  function recordBan(userId, username) {
    if (!F.antiAlt.enabled) return;
    F.antiAlt.recentBans.push({ userId, username, bannedAt: Date.now() });
    // Keep only recent bans (last 24h)
    const cutoff = Date.now() - 86400000;
    F.antiAlt.recentBans = F.antiAlt.recentBans.filter(b => b.bannedAt > cutoff);
  }

  async function checkNewMemberForAlt(member) {
    if (!F.antiAlt.enabled) return;

    const accountAge = Date.now() - member.user.createdTimestamp;
    const minAge = (F.antiAlt.minAccountAgeDays || 7) * 86400000;
    const isYoungAccount = accountAge < minAge;

    // Check if any ban happened recently
    const banWindow = (F.antiAlt.banWindowMinutes || 30) * 60000;
    const recentBan = F.antiAlt.recentBans.find(b => Date.now() - b.bannedAt < banWindow);

    // Only flag if account is young OR joined shortly after a ban
    if (!isYoungAccount && !recentBan) return;

    const reasons = [];
    if (isYoungAccount) {
      const ageDays = Math.floor(accountAge / 86400000);
      reasons.push(`Account age: ${ageDays} day${ageDays !== 1 ? 's' : ''} (min: ${F.antiAlt.minAccountAgeDays})`);
    }
    if (recentBan) {
      reasons.push(`Joined ${Math.floor((Date.now() - recentBan.bannedAt) / 60000)}min after ban of ${recentBan.username}`);
    }

    const flagEntry = {
      userId: member.id,
      username: member.user.tag,
      reason: reasons.join('; '),
      joinedAt: Date.now(),
      accountCreated: member.user.createdTimestamp,
      action: F.antiAlt.action
    };
    F.antiAlt.flagged.push(flagEntry);
    // Cap flagged list
    if (F.antiAlt.flagged.length > 500) F.antiAlt.flagged = F.antiAlt.flagged.slice(-250);

    addLog('warn', `Anti-alt flagged: ${member.user.tag} — ${flagEntry.reason}`);

    // Log to channel
    if (F.antiAlt.logChannelId) {
      try {
        const ch = await client.channels.fetch(F.antiAlt.logChannelId).catch(() => null);
        if (ch) {
          const embed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('🚨 Suspicious Account Detected')
            .setDescription(`<@${member.id}> (${member.user.tag})`)
            .addFields(
              { name: 'Reason', value: flagEntry.reason },
              { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
              { name: 'Action', value: F.antiAlt.action, inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();
          await ch.send({ embeds: [embed] });
        }
      } catch {}
    }

    // Execute action
    try {
      if (F.antiAlt.action === 'kick') {
        await member.kick('Anti-alt: suspicious account detected');
        addLog('info', `Anti-alt kicked: ${member.user.tag}`);
      } else if (F.antiAlt.action === 'quarantine' && F.antiAlt.quarantineRoleId) {
        if (member.guild.roles.cache.has(F.antiAlt.quarantineRoleId)) {
          await member.roles.add(F.antiAlt.quarantineRoleId, 'Anti-alt: quarantined');
          addLog('info', `Anti-alt quarantined: ${member.user.tag}`);
        }
      }
    } catch (e) {
      addLog('error', `Anti-alt action failed for ${member.user.tag}: ${e.message}`);
    }

    saveState();
  }

  // API routes
  app.get('/api/features/anti-alt', requireAuth, requireTier('admin'), (req, res) => {
    res.json({
      success: true,
      config: {
        enabled: F.antiAlt.enabled,
        minAccountAgeDays: F.antiAlt.minAccountAgeDays,
        logChannelId: F.antiAlt.logChannelId,
        action: F.antiAlt.action,
        quarantineRoleId: F.antiAlt.quarantineRoleId,
        banWindowMinutes: F.antiAlt.banWindowMinutes
      },
      flagged: F.antiAlt.flagged.slice(-100),
      recentBans: F.antiAlt.recentBans.length
    });
  });

  app.post('/api/features/anti-alt', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, minAccountAgeDays, logChannelId, action, quarantineRoleId, banWindowMinutes } = req.body;
    if (typeof enabled === 'boolean') F.antiAlt.enabled = enabled;
    if (minAccountAgeDays != null) F.antiAlt.minAccountAgeDays = Math.max(1, Math.min(90, parseInt(minAccountAgeDays) || 7));
    if (logChannelId !== undefined) F.antiAlt.logChannelId = logChannelId || null;
    if (['log', 'kick', 'quarantine'].includes(action)) F.antiAlt.action = action;
    if (quarantineRoleId !== undefined) F.antiAlt.quarantineRoleId = quarantineRoleId || null;
    if (banWindowMinutes != null) F.antiAlt.banWindowMinutes = Math.max(5, Math.min(1440, parseInt(banWindowMinutes) || 30));
    saveState();
    dashAudit(req.userName, 'update-anti-alt', `Anti-alt: enabled=${F.antiAlt.enabled}, action=${F.antiAlt.action}`);
    res.json({ success: true });
  });

  app.get('/api/features/anti-alt/flagged', requireAuth, requireTier('moderator'), (req, res) => {
    res.json({ success: true, flagged: F.antiAlt.flagged.slice(-200) });
  });

  app.post('/api/features/anti-alt/clear-flags', requireAuth, requireTier('admin'), (req, res) => {
    F.antiAlt.flagged = [];
    saveState();
    res.json({ success: true });
  });

  return {
    hooks: { checkNewMemberForAlt, recordBan },
    backgroundTasks: [],
    masterData: () => ({ antiAlt: { enabled: F.antiAlt.enabled, flagged: F.antiAlt.flagged.length } })
  };
}
