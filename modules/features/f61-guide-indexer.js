import fs from 'fs';
import path from 'path';
import { AttachmentBuilder } from 'discord.js';

/**
 * F61 — Guide Indexer & Patch Notes Analyzer
 * Indexes Discord forum threads (guides), downloads images locally,
 * supports editing + re-posting from dashboard, and auto-bumps threads.
 */
export default function setup(app, deps, F, shared) {
  const { requireAuth, requireTier, saveState, dashAudit, addLog, client, smartBot, loadJSON, saveJSON, DATA_DIR } = deps;

  const GUIDES_PATH = path.join(DATA_DIR, 'guides-index.json');
  const ROOT_DIR = path.resolve(DATA_DIR, '..');
  const UPLOADS_DIR = process.env.PERSISTENT_DATA_DIR
    ? path.join(process.env.PERSISTENT_DATA_DIR, 'uploads', 'guides')
    : path.join(ROOT_DIR, 'uploads', 'guides');

  // Ensure uploads dir exists
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  // Initialize state
  if (!F.guideIndexer) F.guideIndexer = {
    enabled: false,
    forumChannelIds: [],
    lastScanAt: null,
    autoScanInterval: 0,   // hours, 0 = off
    autoBumpEnabled: false,
    autoBumpIntervalHours: 23,
    lastBumpAt: null,
    guides: {},
    analyses: [],
  };

  // ── Persistence helpers ──
  function loadGuides() {
    try { return JSON.parse(fs.readFileSync(GUIDES_PATH, 'utf8')); }
    catch { return { guides: {}, analyses: [] }; }
  }
  function saveGuides(data) {
    fs.writeFileSync(GUIDES_PATH, JSON.stringify(data, null, 2));
  }

  // Sync F state with file on start
  const stored = loadGuides();
  if (stored.guides && Object.keys(stored.guides).length > 0 && Object.keys(F.guideIndexer.guides).length === 0) {
    F.guideIndexer.guides = stored.guides;
    F.guideIndexer.analyses = stored.analyses || [];
  }

  // ── Download an image from URL to local storage ──
  async function downloadImage(url, threadId, filename) {
    const threadDir = path.join(UPLOADS_DIR, threadId);
    fs.mkdirSync(threadDir, { recursive: true });
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      // Sanitize filename
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
      const dest = path.join(threadDir, safeName);
      fs.writeFileSync(dest, buf);
      return `/uploads/guides/${threadId}/${safeName}`;
    } catch (err) {
      addLog('warn', `Guide indexer: Failed to download image ${filename}: ${err.message}`);
      return null;
    }
  }

  // Extract inline image URLs from markdown text
  function extractInlineImages(text) {
    const urls = [];
    const patterns = [
      /!\[[^\]]*\]\((https?:\/\/[^\s)]+\.(png|jpe?g|gif|webp)[^\s)]*)\)/gi,
      /(https?:\/\/[^\s<>"]+\.(png|jpe?g|gif|webp)(\?[^\s<>"]*)?)/gi,
    ];
    for (const pat of patterns) {
      let m;
      while ((m = pat.exec(text)) !== null) {
        if (!urls.includes(m[1])) urls.push(m[1]);
      }
    }
    return urls;
  }

  // ── Parse a thread into structured sections ──
  function parseGuideContent(messages) {
    const fullText = messages.map(m => m.content).filter(Boolean).join('\n\n');
    const sections = [];
    let currentHeading = 'Introduction';
    let currentContent = [];

    for (const line of fullText.split('\n')) {
      const trimmed = line.trim();
      // Detect headings: markdown #, bold **, or ALL CAPS lines
      if (/^#{1,3}\s+/.test(trimmed)) {
        if (currentContent.length) sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
        currentHeading = trimmed.replace(/^#+\s*/, '');
        currentContent = [];
      } else if (/^\*\*[^*]+\*\*$/.test(trimmed) && trimmed.length < 80) {
        if (currentContent.length) sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
        currentHeading = trimmed.replace(/\*\*/g, '');
        currentContent = [];
      } else if (/^[A-Z][A-Z\s&:/-]{4,60}$/.test(trimmed) && !/^(AND|THE|FOR|BUT|NOT)$/.test(trimmed)) {
        if (currentContent.length) sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
        currentHeading = trimmed;
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }
    if (currentContent.length) sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });

    // Extract key values (numbers, stats, percentages)
    const values = {};
    const valuePattern = /([A-Za-z][\w\s'-]{2,30})[:=\-–—]\s*([\d,.]+%?(?:\s*[-–/]\s*[\d,.]+%?)?)/g;
    let match;
    while ((match = valuePattern.exec(fullText)) !== null) {
      const key = match[1].trim();
      if (key.length > 3) values[key] = match[2].trim();
    }

    // Extract tags from thread tags if available
    return { sections, values, fullText };
  }

  // ── Index a single thread ──
  async function indexThread(thread) {
    try {
      const messages = [];
      let lastId;
      // Fetch all messages (up to 500)
      for (let i = 0; i < 5; i++) {
        const batch = await thread.messages.fetch({ limit: 100, ...(lastId ? { before: lastId } : {}) });
        if (batch.size === 0) break;
        batch.forEach(m => messages.push({
          id: m.id,
          content: m.content,
          authorId: m.author.id,
          authorTag: m.author.tag,
          attachments: [...m.attachments.values()].map(a => ({ name: a.name, url: a.url, contentType: a.contentType })),
        }));
        lastId = batch.last().id;
        if (batch.size < 100) break;
      }

      if (messages.length === 0) return null;

      const { sections, values, fullText } = parseGuideContent(messages);
      const firstMsg = messages[messages.length - 1]; // oldest

      // Download images: attachments + inline
      const images = [];
      for (const msg of messages) {
        for (const att of msg.attachments) {
          if (/^image\//i.test(att.contentType || '')) {
            const localPath = await downloadImage(att.url, thread.id, att.name);
            if (localPath) images.push({ original: att.url, local: localPath, name: att.name, messageId: msg.id });
          }
        }
        const inlineUrls = extractInlineImages(msg.content || '');
        for (const url of inlineUrls) {
          const fname = `inline_${msg.id}_${images.length}.${url.split('.').pop().split('?')[0] || 'png'}`;
          const localPath = await downloadImage(url, thread.id, fname);
          if (localPath) images.push({ original: url, local: localPath, name: fname, messageId: msg.id });
        }
      }

      // Store message IDs for re-post (delete old messages)
      const messageIds = messages.map(m => m.id);

      return {
        title: thread.name,
        threadId: thread.id,
        channelId: thread.parentId,
        sections,
        values,
        images,
        messageIds,
        tags: thread.appliedTags?.map(t => {
          const tag = thread.parent?.availableTags?.find(at => at.id === t);
          return tag?.name || t;
        }) || [],
        lastIndexed: new Date().toISOString(),
        messageCount: messages.length,
        authorId: firstMsg.authorId,
        authorTag: firstMsg.authorTag,
        contentLength: fullText.length,
      };
    } catch (err) {
      addLog('error', `Guide indexer: Failed to index thread ${thread.name}: ${err.message}`);
      return null;
    }
  }

  // ── Scan an entire forum channel ──
  async function scanForum(channelId) {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || channel.type !== 15) { // 15 = GuildForum
      throw new Error(`Channel ${channelId} is not a forum channel`);
    }

    const threads = [];

    // Fetch active threads
    const active = await channel.threads.fetchActive();
    active.threads.forEach(t => threads.push(t));

    // Fetch archived threads (up to 100)
    let hasMore = true;
    let before;
    while (hasMore && threads.length < 200) {
      const archived = await channel.threads.fetchArchived({ limit: 100, before });
      archived.threads.forEach(t => threads.push(t));
      hasMore = archived.hasMore;
      if (archived.threads.size > 0) before = archived.threads.last().id;
      else break;
    }

    let indexed = 0;
    for (const thread of threads) {
      const guide = await indexThread(thread);
      if (guide) {
        F.guideIndexer.guides[thread.id] = guide;
        indexed++;
      }
    }

    F.guideIndexer.lastScanAt = new Date().toISOString();
    saveState();
    saveGuides({ guides: F.guideIndexer.guides, analyses: F.guideIndexer.analyses });

    return { total: threads.length, indexed };
  }

  // ── AI‑powered patch analysis ──
  async function analyzePatchNotes(patchTitle, patchText) {
    const guides = F.guideIndexer.guides;
    const guideCount = Object.keys(guides).length;
    if (guideCount === 0) throw new Error('No guides indexed yet. Scan a forum first.');

    // Build compact guide summaries for AI context
    const guideSummaries = Object.entries(guides).map(([id, g]) => {
      const sectionList = g.sections.map(s => `  [${s.heading}]: ${s.content.slice(0, 200)}`).join('\n');
      const valueList = Object.entries(g.values || {}).slice(0, 20).map(([k, v]) => `  ${k}: ${v}`).join('\n');
      return `GUIDE "${g.title}" (ID:${id}, tags: ${g.tags.join(', ') || 'none'})\nSections:\n${sectionList}\n${valueList ? 'Values:\n' + valueList : ''}`;
    }).join('\n---\n');

    // Trim if too large (keep under ~6000 chars for AI context)
    const maxCtx = 6000;
    const trimmedSummaries = guideSummaries.length > maxCtx
      ? guideSummaries.slice(0, maxCtx) + '\n... (truncated)'
      : guideSummaries;

    const systemPrompt = `You are a guide maintenance assistant. You compare game patch notes against existing player guides to find what needs updating.

RULES:
- Match items/skills/mechanics even when names differ slightly (abbreviations, alternate names, context clues)
- For each affected guide, list EVERY specific change needed
- Rate confidence: CERTAIN (exact match), PROBABLE (strong context match), POSSIBLE (indirect impact)
- Output valid JSON only, no markdown fences

OUTPUT FORMAT (JSON array):
[{
  "guideId": "thread-id",
  "guideTitle": "Guide Name",
  "confidence": "CERTAIN|PROBABLE|POSSIBLE",
  "changes": [{
    "section": "Section Name",
    "item": "What changed",
    "oldValue": "current guide value or description",
    "newValue": "new value from patch",
    "note": "brief explanation"
  }]
}]

If no guides are affected, return [].`;

    const userPrompt = `EXISTING GUIDES:\n${trimmedSummaries}\n\n---\nPATCH NOTES: "${patchTitle}"\n${patchText}`;

    // Call AI via SmartBot's AI engine
    const ai = smartBot?.ai;
    if (!ai?.enabled) throw new Error('AI is not configured. Set a Groq API key in SmartBot settings.');

    const aiSystemPrompt = systemPrompt;
    const aiUserPrompt = userPrompt;

    // Direct Groq call for structured output
    let rawReply;
    if (ai.groqKey) {
      rawReply = await ai._callGroq(aiSystemPrompt, aiUserPrompt);
    } else if (ai.hfKey) {
      rawReply = await ai._callHuggingFace(aiSystemPrompt, aiUserPrompt);
    }

    if (!rawReply) throw new Error('AI did not return a response. Check API key and rate limits.');

    // Parse JSON from response (handle markdown fences)
    let results;
    try {
      const jsonStr = rawReply.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      results = JSON.parse(jsonStr);
    } catch {
      // If AI didn't return valid JSON, wrap in a freeform result
      results = [{ guideId: 'unknown', guideTitle: 'AI Analysis', confidence: 'POSSIBLE', changes: [{ section: 'General', item: 'See AI response', oldValue: '', newValue: '', note: rawReply.slice(0, 1000) }] }];
    }

    // Store analysis
    const analysis = {
      id: Date.now().toString(36),
      date: new Date().toISOString(),
      patchTitle,
      patchText: patchText.slice(0, 2000),
      results,
      guidesAffected: results.filter(r => r.changes?.length > 0).length,
    };
    F.guideIndexer.analyses.unshift(analysis);
    if (F.guideIndexer.analyses.length > 50) F.guideIndexer.analyses.length = 50;
    saveState();
    saveGuides({ guides: F.guideIndexer.guides, analyses: F.guideIndexer.analyses });

    return analysis;
  }

  // ── Format analysis as Discord embed text ──
  function formatAnalysisForDiscord(analysis) {
    if (!analysis.results || analysis.results.length === 0) {
      return '✅ No guides need updating based on these patch notes.';
    }

    const icons = { CERTAIN: '🔴', PROBABLE: '🟡', POSSIBLE: '🟠' };
    let text = `📋 **${analysis.patchTitle}** — ${analysis.guidesAffected} guide(s) to update\n\n`;

    for (const r of analysis.results) {
      if (!r.changes?.length) continue;
      text += `${icons[r.confidence] || '⚪'} **${r.confidence}** — "${r.guideTitle}"\n`;
      for (const c of r.changes) {
        const val = c.oldValue && c.newValue ? ` \`${c.oldValue}\` → \`${c.newValue}\`` : '';
        text += `  • **${c.section}** → ${c.item}${val}\n`;
        if (c.note) text += `    _${c.note}_\n`;
      }
      text += '\n';
    }

    return text.slice(0, 4000); // Discord limit
  }

  // ══════════════════════ API ROUTES ══════════════════════

  // Get config & stats
  app.get('/api/features/guide-indexer', requireAuth, requireTier('admin'), (req, res) => {
    const guides = F.guideIndexer.guides;
    const guideList = Object.entries(guides).map(([id, g]) => ({
      id, title: g.title, sections: g.sections.length, values: Object.keys(g.values || {}).length,
      images: (g.images || []).length,
      tags: g.tags, lastIndexed: g.lastIndexed, messageCount: g.messageCount, authorTag: g.authorTag,
    }));
    res.json({
      success: true,
      config: {
        enabled: F.guideIndexer.enabled,
        forumChannelIds: F.guideIndexer.forumChannelIds,
        autoScanInterval: F.guideIndexer.autoScanInterval,
        lastScanAt: F.guideIndexer.lastScanAt,
        autoBumpEnabled: F.guideIndexer.autoBumpEnabled,
        autoBumpIntervalHours: F.guideIndexer.autoBumpIntervalHours,
        lastBumpAt: F.guideIndexer.lastBumpAt,
      },
      stats: { totalGuides: guideList.length, totalAnalyses: F.guideIndexer.analyses.length },
      guides: guideList,
      analyses: (F.guideIndexer.analyses || []).slice(0, 20).map(a => ({
        id: a.id, date: a.date, patchTitle: a.patchTitle, guidesAffected: a.guidesAffected,
      })),
    });
  });

  // Update config
  app.post('/api/features/guide-indexer/config', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, forumChannelIds, autoScanInterval } = req.body;
    if (typeof enabled === 'boolean') F.guideIndexer.enabled = enabled;
    if (Array.isArray(forumChannelIds)) F.guideIndexer.forumChannelIds = forumChannelIds.map(String).slice(0, 10);
    if (typeof autoScanInterval === 'number') F.guideIndexer.autoScanInterval = Math.max(0, Math.min(168, autoScanInterval));
    saveState();
    dashAudit(req.userName, 'update-guide-indexer', `Guide indexer: enabled=${F.guideIndexer.enabled}`);
    res.json({ success: true });
  });

  // Trigger scan
  app.post('/api/features/guide-indexer/scan', requireAuth, requireTier('admin'), async (req, res) => {
    try {
      const channelIds = F.guideIndexer.forumChannelIds;
      if (channelIds.length === 0) return res.json({ success: false, error: 'No forum channels configured' });

      let totalThreads = 0, totalIndexed = 0;
      for (const cid of channelIds) {
        const result = await scanForum(cid);
        totalThreads += result.total;
        totalIndexed += result.indexed;
      }

      addLog('info', `Guide indexer: Scanned ${totalThreads} threads, indexed ${totalIndexed}`);
      dashAudit(req.userName, 'scan-guides', `Scanned ${totalIndexed} guides from ${channelIds.length} forum(s)`);
      res.json({ success: true, total: totalThreads, indexed: totalIndexed });
    } catch (err) {
      addLog('error', `Guide scan failed: ${err.message}`);
      res.json({ success: false, error: err.message });
    }
  });

  // Analyze patch notes
  app.post('/api/features/guide-indexer/analyze', requireAuth, requireTier('admin'), async (req, res) => {
    try {
      const { patchTitle, patchText } = req.body;
      if (!patchText || typeof patchText !== 'string') return res.json({ success: false, error: 'Patch notes text required' });
      const title = (typeof patchTitle === 'string' && patchTitle.trim()) ? patchTitle.trim().slice(0, 100) : 'Untitled Patch';

      const analysis = await analyzePatchNotes(title, patchText.slice(0, 8000));
      dashAudit(req.userName, 'analyze-patch', `Analyzed "${title}" — ${analysis.guidesAffected} guides affected`);
      res.json({ success: true, analysis });
    } catch (err) {
      addLog('error', `Patch analysis failed: ${err.message}`);
      res.json({ success: false, error: err.message });
    }
  });

  // Get full analysis by id
  app.get('/api/features/guide-indexer/analysis/:id', requireAuth, requireTier('admin'), (req, res) => {
    const analysis = F.guideIndexer.analyses.find(a => a.id === req.params.id);
    if (!analysis) return res.json({ success: false, error: 'Analysis not found' });
    res.json({ success: true, analysis });
  });

  // Get guide details
  app.get('/api/features/guide-indexer/guide/:id', requireAuth, requireTier('admin'), (req, res) => {
    const guide = F.guideIndexer.guides[req.params.id];
    if (!guide) return res.json({ success: false, error: 'Guide not found' });
    res.json({ success: true, guide });
  });

  // Delete a single guide from index
  app.delete('/api/features/guide-indexer/guide/:id', requireAuth, requireTier('admin'), (req, res) => {
    delete F.guideIndexer.guides[req.params.id];
    saveState();
    saveGuides({ guides: F.guideIndexer.guides, analyses: F.guideIndexer.analyses });
    dashAudit(req.userName, 'delete-guide-index', `Removed guide ${req.params.id} from index`);
    res.json({ success: true });
  });

  // Update guide content from dashboard editor
  app.post('/api/features/guide-indexer/guide/:id/update', requireAuth, requireTier('admin'), (req, res) => {
    const guide = F.guideIndexer.guides[req.params.id];
    if (!guide) return res.json({ success: false, error: 'Guide not found' });

    const { sections } = req.body;
    if (Array.isArray(sections)) {
      guide.sections = sections.map(s => ({
        heading: String(s.heading || '').slice(0, 200),
        content: String(s.content || '').slice(0, 10000),
      }));
      guide.lastEdited = new Date().toISOString();
    }
    saveState();
    saveGuides({ guides: F.guideIndexer.guides, analyses: F.guideIndexer.analyses });
    dashAudit(req.userName, 'edit-guide', `Edited guide "${guide.title}" (${req.params.id})`);
    res.json({ success: true });
  });

  // Re-post guide to Discord (delete old messages, post updated content + images)
  app.post('/api/features/guide-indexer/guide/:id/repost', requireAuth, requireTier('admin'), async (req, res) => {
    const guide = F.guideIndexer.guides[req.params.id];
    if (!guide) return res.json({ success: false, error: 'Guide not found' });

    try {
      const thread = await client.channels.fetch(guide.threadId).catch(() => null);
      if (!thread) return res.json({ success: false, error: 'Thread not found or inaccessible' });

      // Unarchive if needed
      if (thread.archived) await thread.setArchived(false);

      // Delete old messages (the ones we indexed)
      if (guide.messageIds?.length) {
        for (const msgId of guide.messageIds) {
          try {
            const msg = await thread.messages.fetch(msgId).catch(() => null);
            if (msg?.deletable) await msg.delete();
          } catch { /* skip undeletable */ }
        }
      }

      // Rebuild content from sections
      const contentParts = [];
      for (const section of guide.sections) {
        contentParts.push(`## ${section.heading}\n${section.content}`);
      }
      const fullContent = contentParts.join('\n\n');

      // Split into 2000-char messages (Discord limit)
      const chunks = [];
      let current = '';
      for (const line of fullContent.split('\n')) {
        if ((current + '\n' + line).length > 1900) {
          chunks.push(current);
          current = line;
        } else {
          current += (current ? '\n' : '') + line;
        }
      }
      if (current) chunks.push(current);

      // Attach images to first message
      const files = [];
      if (guide.images?.length) {
        for (const img of guide.images) {
          const absPath = path.join(UPLOADS_DIR, '..', '..', img.local.replace(/^\/uploads\//, ''));
          const resolvedPath = path.resolve(UPLOADS_DIR, '..', img.local.replace(/^\/uploads\/guides\//, ''));
          // Try both path resolution approaches
          const filePath = fs.existsSync(resolvedPath) ? resolvedPath : absPath;
          if (fs.existsSync(filePath)) {
            files.push(new AttachmentBuilder(filePath, { name: img.name }));
          }
        }
      }

      // Post the new messages
      const newMessageIds = [];
      for (let i = 0; i < chunks.length; i++) {
        const opts = { content: chunks[i] };
        if (i === 0 && files.length) opts.files = files;
        const sent = await thread.send(opts);
        newMessageIds.push(sent.id);
      }

      // Update stored message IDs
      guide.messageIds = newMessageIds;
      guide.lastReposted = new Date().toISOString();
      saveState();
      saveGuides({ guides: F.guideIndexer.guides, analyses: F.guideIndexer.analyses });

      dashAudit(req.userName, 'repost-guide', `Re-posted guide "${guide.title}" (${guide.threadId})`);
      addLog('info', `Guide indexer: Re-posted "${guide.title}" with ${chunks.length} message(s) and ${files.length} image(s)`);
      res.json({ success: true, messagesSent: chunks.length, imagesSent: files.length });
    } catch (err) {
      addLog('error', `Guide re-post failed for ${req.params.id}: ${err.message}`);
      res.json({ success: false, error: err.message });
    }
  });

  // Auto-bump config
  app.post('/api/features/guide-indexer/bump-config', requireAuth, requireTier('admin'), (req, res) => {
    const { autoBumpEnabled, autoBumpIntervalHours } = req.body;
    if (typeof autoBumpEnabled === 'boolean') F.guideIndexer.autoBumpEnabled = autoBumpEnabled;
    if (typeof autoBumpIntervalHours === 'number') F.guideIndexer.autoBumpIntervalHours = Math.max(1, Math.min(168, autoBumpIntervalHours));
    saveState();
    dashAudit(req.userName, 'bump-config', `Auto-bump: ${F.guideIndexer.autoBumpEnabled ? 'ON' : 'OFF'} (${F.guideIndexer.autoBumpIntervalHours}h)`);
    res.json({ success: true });
  });

  // Manual bump all threads
  app.post('/api/features/guide-indexer/bump', requireAuth, requireTier('admin'), async (req, res) => {
    try {
      const results = await bumpAllThreads();
      dashAudit(req.userName, 'manual-bump', `Bumped ${results.bumped}/${results.total} threads`);
      res.json({ success: true, ...results });
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });

  // ── Bump all indexed threads to prevent archival ──
  async function bumpAllThreads() {
    const guides = F.guideIndexer.guides;
    const threadIds = Object.keys(guides);
    let bumped = 0, failed = 0;

    for (const tid of threadIds) {
      try {
        const thread = await client.channels.fetch(tid).catch(() => null);
        if (!thread) { failed++; continue; }
        if (thread.archived) {
          await thread.setArchived(false);
        }
        bumped++;
      } catch {
        failed++;
      }
    }

    F.guideIndexer.lastBumpAt = new Date().toISOString();
    saveState();
    addLog('info', `Guide indexer: Bumped ${bumped}/${threadIds.length} threads (${failed} failed)`);
    return { total: threadIds.length, bumped, failed };
  }

  // ── Background task: auto‑scan ──
  const bgTasks = [];
  if (F.guideIndexer.autoScanInterval > 0) {
    bgTasks.push({
      fn: async () => {
        if (!F.guideIndexer.enabled || F.guideIndexer.forumChannelIds.length === 0) return;
        try {
          for (const cid of F.guideIndexer.forumChannelIds) {
            await scanForum(cid);
          }
          addLog('info', 'Guide indexer: Auto-scan completed');
        } catch (err) {
          addLog('error', `Guide auto-scan failed: ${err.message}`);
        }
      },
      intervalMs: F.guideIndexer.autoScanInterval * 60 * 60 * 1000,
      runOnStart: false,
    });
  }

  // ── Background task: auto‑bump ──
  bgTasks.push({
    fn: async () => {
      if (!F.guideIndexer.autoBumpEnabled || Object.keys(F.guideIndexer.guides).length === 0) return;
      try {
        await bumpAllThreads();
      } catch (err) {
        addLog('error', `Guide auto-bump failed: ${err.message}`);
      }
    },
    intervalMs: (F.guideIndexer.autoBumpIntervalHours || 23) * 60 * 60 * 1000,
    runOnStart: false,
  });

  return {
    hooks: {},
    backgroundTasks: bgTasks,
    masterData: () => ({
      guideIndexer: {
        enabled: F.guideIndexer.enabled,
        totalGuides: Object.keys(F.guideIndexer.guides).length,
        totalAnalyses: (F.guideIndexer.analyses || []).length,
        autoBumpEnabled: F.guideIndexer.autoBumpEnabled,
        lastBumpAt: F.guideIndexer.lastBumpAt,
      }
    }),
    exports: {
      scanForum,
      analyzePatchNotes,
      formatAnalysisForDiscord,
      indexThread,
      bumpAllThreads,
    },
  };
}
