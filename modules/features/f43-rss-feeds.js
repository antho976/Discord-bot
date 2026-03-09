import { EmbedBuilder } from 'discord.js';

export default function setup(app, deps, F) {
  const { addLog, client, requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.rssFeeds) F.rssFeeds = { enabled: false, feeds: [] };

  async function checkRSSFeeds() {
    if (!F.rssFeeds.enabled || !F.rssFeeds.feeds.length) return;
    for (const feed of F.rssFeeds.feeds) {
      try {
        if (!feed.url || !feed.channelId) continue;
        const resp = await fetch(feed.url).catch(() => null);
        if (!resp || !resp.ok) continue;
        const text = await resp.text();
        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
        let match;
        while ((match = itemRegex.exec(text)) !== null && items.length < 5) {
          const itemXml = match[1];
          const title = itemXml.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i)?.[1] || 'Untitled';
          const link = itemXml.match(/<link>(.*?)<\/link>/i)?.[1] || '';
          const guid = itemXml.match(/<guid.*?>(.*?)<\/guid>/i)?.[1] || link || title;
          items.push({ title, link, guid });
        }
        if (items.length === 0) continue;
        const newest = items[0];
        if (newest.guid === feed.lastItemId) continue;
        feed.lastItemId = newest.guid;
        const ch = await client.channels.fetch(feed.channelId).catch(() => null);
        if (!ch) continue;
        const embed = new EmbedBuilder()
          .setColor(0xE67E22).setTitle(newest.title.slice(0, 256))
          .setURL(newest.link || undefined)
          .setFooter({ text: feed.label || 'RSS Feed' }).setTimestamp();
        await ch.send({ embeds: [embed] });
        addLog('info', `RSS posted: ${newest.title} from ${feed.label || feed.url}`);
      } catch (e) {
        addLog('error', `RSS feed check failed (${feed.label || feed.url}): ${e.message}`);
      }
    }
  }

  app.get('/api/features/rss-feeds', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: F.rssFeeds });
  });
  app.post('/api/features/rss-feeds', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, feeds } = req.body;
    if (typeof enabled === 'boolean') F.rssFeeds.enabled = enabled;
    if (Array.isArray(feeds)) {
      F.rssFeeds.feeds = feeds.slice(0, 15).map(f => {
        try { new URL(f.url); } catch { return null; }
        return {
          url: String(f.url || ''), channelId: String(f.channelId || ''),
          lastItemId: f.lastItemId || null, label: String(f.label || '').slice(0, 50),
          intervalMin: Math.max(5, Math.min(1440, parseInt(f.intervalMin) || 15))
        };
      }).filter(Boolean);
    }
    saveState();
    dashAudit(req.userName, 'update-rss-feeds', `RSS feeds: ${F.rssFeeds.feeds.length} configured, enabled=${F.rssFeeds.enabled}`);
    res.json({ success: true, config: F.rssFeeds });
  });

  return {
    hooks: {},
    backgroundTasks: [{ fn: checkRSSFeeds, intervalMs: 900000 }],
    masterData: () => ({ rssFeeds: { enabled: F.rssFeeds.enabled, feeds: F.rssFeeds.feeds.length } })
  };
}
