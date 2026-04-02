import { EmbedBuilder } from 'discord.js';

export default function setup(app, deps, F) {
  const { addLog, client, requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.ytCommunityPosts) {
    F.ytCommunityPosts = {
      enabled: false,
      youtubeChannelId: '',
      discordChannelId: '',
      lastPostId: null,
      lastCheckAt: null,
      lastError: null,
      checkIntervalMin: 15,
    };
  }
  const cfg = F.ytCommunityPosts;

  /**
   * Fetch community posts via YouTube's innertube browse API.
   * This is the same internal JSON API that YouTube's frontend uses,
   * far more reliable than scraping HTML which often returns 500.
   */
  async function fetchCommunityPosts(channelId) {
    // Innertube API endpoint — same as what the YT web client calls
    const apiUrl = 'https://www.youtube.com/youtubei/v1/browse?prettyPrint=false';

    // "Egljb21tdW5pdHk%3D" is base64-protobuf for the community tab
    const body = {
      browseId: channelId,
      params: 'Egljb21tdW5pdHk%3D',
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20240530.02.00',
          hl: 'en',
          gl: 'US',
        },
      },
    };

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Origin': 'https://www.youtube.com',
        'Referer': `https://www.youtube.com/channel/${channelId}/community`,
      },
      body: JSON.stringify(body),
    }).catch(() => null);

    if (!resp) throw new Error('YouTube innertube request failed (no response)');
    if (!resp.ok) throw new Error(`YouTube innertube request failed (${resp.status})`);

    let data;
    try { data = await resp.json(); } catch { throw new Error('Failed to parse innertube response'); }

    // Navigate to the community tab contents
    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    const communityTab = tabs.find(t => {
      const url = t?.tabRenderer?.endpoint?.commandMetadata?.webCommandMetadata?.url || '';
      return url.includes('/community') || url.includes('/posts');
    });
    if (!communityTab) throw new Error('Community tab not found — channel may not have community posts enabled');

    const sectionList = communityTab?.tabRenderer?.content?.sectionListRenderer?.contents || [];
    const items = sectionList?.[0]?.itemSectionRenderer?.contents || [];

    const posts = [];
    for (const item of items) {
      const postRenderer = item?.backstagePostThreadRenderer?.post?.backstagePostRenderer;
      if (!postRenderer) continue;

      const postId = postRenderer.postId;
      const authorName = postRenderer.authorText?.runs?.[0]?.text || 'Unknown';
      const authorThumb = postRenderer.authorThumbnail?.thumbnails?.slice(-1)?.[0]?.url || null;

      // Extract text content
      const textRuns = postRenderer.contentText?.runs || [];
      const text = textRuns.map(r => r.text || '').join('');

      // Extract image if present
      const images = postRenderer.backstageAttachment?.backstageImageRenderer?.image?.thumbnails || [];
      const imageUrl = images.length > 0 ? images[images.length - 1].url : null;

      // Extract poll if present
      const pollRenderer = postRenderer.backstageAttachment?.pollRenderer;
      let pollChoices = null;
      if (pollRenderer) {
        pollChoices = (pollRenderer.choices || []).map(c =>
          (c.text?.runs || []).map(r => r.text).join('')
        );
      }

      // Published time text
      const publishedText = postRenderer.publishedTimeText?.runs?.[0]?.text || '';

      // Vote count
      const voteCount = postRenderer.voteCount?.simpleText || '0';

      posts.push({
        id: postId,
        author: authorName,
        authorThumb,
        text: text.slice(0, 4000),
        imageUrl,
        pollChoices,
        publishedText,
        voteCount,
        url: `https://www.youtube.com/post/${postId}`,
      });
    }

    return posts;
  }

  async function checkCommunityPosts() {
    if (!cfg.enabled || !cfg.youtubeChannelId || !cfg.discordChannelId) return;

    cfg.lastCheckAt = Date.now();

    try {
      const posts = await fetchCommunityPosts(cfg.youtubeChannelId);
      if (posts.length === 0) return;

      const newest = posts[0];

      // First run — just store the latest post ID
      if (!cfg.lastPostId) {
        cfg.lastPostId = newest.id;
        saveState();
        addLog('info', `YT Community Posts: initialized, latest post = ${newest.id}`);
        return;
      }

      // No new post
      if (newest.id === cfg.lastPostId) return;

      // Find all new posts (between newest and lastPostId)
      const newPosts = [];
      for (const p of posts) {
        if (p.id === cfg.lastPostId) break;
        newPosts.push(p);
      }

      // Post to Discord (oldest first)
      const channel = await client.channels.fetch(cfg.discordChannelId).catch(() => null);
      if (!channel) {
        cfg.lastError = 'Discord channel not found';
        saveState();
        return;
      }

      for (const post of newPosts.reverse()) {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setAuthor({
            name: post.author,
            iconURL: post.authorThumb || undefined,
            url: `https://www.youtube.com/channel/${cfg.youtubeChannelId}/community`,
          })
          .setTitle('New Community Post')
          .setURL(post.url)
          .setTimestamp();

        if (post.text) {
          embed.setDescription(post.text.slice(0, 4096));
        }

        if (post.imageUrl) {
          embed.setImage(post.imageUrl);
        }

        if (post.pollChoices && post.pollChoices.length > 0) {
          embed.addFields({
            name: 'Poll',
            value: post.pollChoices.map((c, i) => `${i + 1}. ${c}`).join('\n'),
          });
        }

        if (post.voteCount && post.voteCount !== '0') {
          embed.setFooter({ text: `${post.voteCount} votes • ${post.publishedText}` });
        } else if (post.publishedText) {
          embed.setFooter({ text: post.publishedText });
        }

        await channel.send({ embeds: [embed] });
        addLog('info', `YT Community Post forwarded: ${post.id} by ${post.author}`);
      }

      cfg.lastPostId = newest.id;
      cfg.lastError = null;
      saveState();

    } catch (err) {
      cfg.lastError = err.message;
      saveState();
      addLog('error', `YT Community Posts check failed: ${err.message}`);
    }
  }

  // ── API routes ──

  app.get('/api/features/yt-community-posts', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: cfg });
  });

  app.post('/api/features/yt-community-posts', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, youtubeChannelId, discordChannelId, checkIntervalMin } = req.body;
    if (typeof enabled === 'boolean') cfg.enabled = enabled;
    if (youtubeChannelId !== undefined) {
      const cleaned = String(youtubeChannelId || '').trim();
      if (cleaned && !/^UC[\w-]{20,}$/.test(cleaned)) {
        return res.json({ error: 'Invalid YouTube channel ID (must start with UC...)' });
      }
      cfg.youtubeChannelId = cleaned;
    }
    if (discordChannelId !== undefined) {
      const cleaned = String(discordChannelId || '').trim();
      if (cleaned && !/^\d{16,22}$/.test(cleaned)) {
        return res.json({ error: 'Invalid Discord channel ID' });
      }
      cfg.discordChannelId = cleaned;
    }
    if (checkIntervalMin !== undefined) {
      cfg.checkIntervalMin = Math.max(5, Math.min(60, parseInt(checkIntervalMin) || 15));
    }
    saveState();
    dashAudit(req.userName, 'update-yt-community-posts',
      `YT Community Posts: enabled=${cfg.enabled}, channel=${cfg.youtubeChannelId || 'none'}`);
    res.json({ success: true, config: cfg });
  });

  // Manual check trigger
  app.post('/api/features/yt-community-posts/check', requireAuth, requireTier('admin'), async (req, res) => {
    try {
      await checkCommunityPosts();
      res.json({ success: true, lastPostId: cfg.lastPostId, lastError: cfg.lastError });
    } catch (err) {
      res.json({ error: err.message });
    }
  });

  const intervalMs = Math.max(300000, (cfg.checkIntervalMin || 15) * 60000);

  return {
    hooks: {},
    backgroundTasks: [{ fn: checkCommunityPosts, intervalMs }],
    masterData: () => ({
      ytCommunityPosts: {
        enabled: cfg.enabled,
        lastPostId: cfg.lastPostId,
        lastCheckAt: cfg.lastCheckAt,
        lastError: cfg.lastError,
      }
    }),
  };
}
