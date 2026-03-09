import { EmbedBuilder } from 'discord.js';

export default function setup(app, deps, F) {
  const { addLog, client, state, requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.twitchClips) F.twitchClips = { enabled: false, channelId: null, checkIntervalMin: 15, lastClipId: null };

  async function checkTwitchClips() {
    if (!F.twitchClips.enabled || !F.twitchClips.channelId) return;
    try {
      const broadcasterId = state.twitchTokens?.broadcasterId;
      if (!broadcasterId) return;
      const accessToken = state.twitchTokens?.access_token;
      const clientId = process.env.TWITCH_CLIENT_ID;
      if (!accessToken || !clientId) return;
      const resp = await fetch(`https://api.twitch.tv/helix/clips?broadcaster_id=${encodeURIComponent(broadcasterId)}&first=5`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Client-Id': clientId }
      });
      if (!resp.ok) return;
      const json = await resp.json();
      const clips = json.data || [];
      if (!clips.length) return;
      const newest = clips[0];
      if (newest.id === F.twitchClips.lastClipId) return;
      F.twitchClips.lastClipId = newest.id;
      const ch = await client.channels.fetch(F.twitchClips.channelId);
      if (!ch) return;
      const embed = new EmbedBuilder()
        .setColor(0x9146FF).setTitle(`🎬 New Clip: ${newest.title}`)
        .setURL(newest.url).setImage(newest.thumbnail_url)
        .setFooter({ text: `Clipped by ${newest.creator_name}` })
        .setTimestamp(new Date(newest.created_at));
      await ch.send({ embeds: [embed] });
      addLog('info', `Twitch clip posted: ${newest.title}`);
    } catch (e) {
      addLog('error', `Twitch clip check failed: ${e.message}`);
    }
  }

  app.get('/api/features/twitch-clips', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: F.twitchClips });
  });
  app.post('/api/features/twitch-clips', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, channelId, checkIntervalMin } = req.body;
    if (typeof enabled === 'boolean') F.twitchClips.enabled = enabled;
    if (channelId !== undefined) F.twitchClips.channelId = channelId || null;
    if (checkIntervalMin != null) F.twitchClips.checkIntervalMin = Math.max(5, Math.min(120, parseInt(checkIntervalMin) || 15));
    saveState();
    dashAudit(req.userName, 'update-twitch-clips', `Twitch clips: enabled=${F.twitchClips.enabled}`);
    res.json({ success: true, config: F.twitchClips });
  });

  return {
    hooks: {},
    backgroundTasks: [{ fn: checkTwitchClips, intervalMs: (F.twitchClips.checkIntervalMin || 15) * 60000 }],
    masterData: () => ({ twitchClips: { enabled: F.twitchClips.enabled } })
  };
}
