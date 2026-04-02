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
    const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
    const apiUrl = `https://www.youtube.com/youtubei/v1/browse?key=${INNERTUBE_KEY}&prettyPrint=false`;
    const clientCtx = {
      client: { clientName: 'WEB', clientVersion: '2.20260401.01.00', hl: 'en', gl: 'US' },
    };

    async function innertubePost(body) {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => null);
      if (!resp) throw new Error('YouTube innertube request failed (no response)');
      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        throw new Error(`YouTube innertube request failed (${resp.status}): ${errBody.slice(0, 200)}`);
      }
      return resp.json();
    }

    // Step 1: Load channel page to discover the Posts/Community tab and its params
    const channelData = await innertubePost({ browseId: channelId, context: clientCtx });
    const tabs = channelData?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];

    const postsTab = tabs.find(t => {
      const title = (t?.tabRenderer?.title || '').toLowerCase();
      const ep = t?.tabRenderer?.endpoint?.commandMetadata?.webCommandMetadata?.url || '';
      return title === 'community' || title === 'posts'
        || ep.includes('/community') || ep.includes('/posts');
    });
    if (!postsTab) throw new Error('Community/Posts tab not found — channel may not have posts enabled');

    // If the tab is already selected and has content, use it directly
    let items;
    const directItems = postsTab?.tabRenderer?.content?.sectionListRenderer?.contents
      ?.[0]?.itemSectionRenderer?.contents;
    if (directItems?.some(i => i?.backstagePostThreadRenderer)) {
      items = directItems;
    } else {
      // Step 2: Fetch posts tab content using the tab's own params
      const tabParams = postsTab?.tabRenderer?.endpoint?.browseEndpoint?.params;
      const postsData = await innertubePost({
        browseId: channelId,
        params: tabParams,
        context: clientCtx,
      });
      const tabs2 = postsData?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
      const selectedTab = tabs2.find(t => t?.tabRenderer?.selected)
        || tabs2.find(t => (t?.tabRenderer?.title || '').toLowerCase().includes('post'));
      items = selectedTab?.tabRenderer?.content?.sectionListRenderer?.contents
        ?.[0]?.itemSectionRenderer?.contents || [];
    }

    const posts = [];
    for (const item of (items || [])) {
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
